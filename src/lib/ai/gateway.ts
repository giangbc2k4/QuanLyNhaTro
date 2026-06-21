import "server-only";

import { errorMessage, logWarning } from "@/lib/server/logger";

type AiProvider = "gemini" | "groq";

export type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type CccdOcrResult = {
  fullName: string;
  cccd: string;
  dob: string;
  gender: string;
  hometown: string;
  address: string;
  issueDate: string;
  issuedBy: string;
  confidence: number;
};

export type ImageInput = {
  mimeType: string;
  data: string;
};

export type MeterOcrResult = {
  readings: Array<{
    type: "electric" | "water" | "unknown";
    value: number;
    unit: string;
    confidence: number;
  }>;
  imageQuality: "good" | "blurry" | "unreadable";
  notes: string;
};

type ProviderResult = {
  text: string;
  provider: AiProvider;
  model: string;
};

export class AiGatewayError extends Error {
  status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = "AiGatewayError";
    this.status = status;
  }
}

const PROVIDER_NAMES: Record<AiProvider, string> = {
  gemini: "Gemini",
  groq: "Groq",
};

const cccdSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    fullName: { type: "string" },
    cccd: { type: "string" },
    dob: { type: "string" },
    gender: { type: "string" },
    hometown: { type: "string" },
    address: { type: "string" },
    issueDate: { type: "string" },
    issuedBy: { type: "string" },
    confidence: { type: "number", minimum: 0, maximum: 100 },
  },
  required: [
    "fullName",
    "cccd",
    "dob",
    "gender",
    "hometown",
    "address",
    "issueDate",
    "issuedBy",
    "confidence",
  ],
};

const cccdPrompt = [
  "Đọc hai ảnh CCCD Việt Nam và chỉ trả về một JSON object.",
  "Ảnh thứ nhất là mặt trước, ảnh thứ hai là mặt sau của cùng một CCCD.",
  "Các khóa bắt buộc: fullName, cccd, dob, gender, hometown, address, issueDate, issuedBy, confidence.",
  "Nếu không đọc được trường nào, trả chuỗi rỗng cho trường đó, không suy đoán.",
  "Ngày dùng định dạng DD/MM/YYYY. Số CCCD chỉ chứa chữ số.",
  "confidence là số thể hiện độ tin cậy tổng thể từ 0 đến 100.",
].join(" ");

function readKeys(pluralName: string, singularName: string) {
  const raw = process.env[pluralName] || process.env[singularName] || "";

  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((key) => key.trim())
        .filter(Boolean)
    ),
  ];
}

function readProviderOrder(
  environmentName: string,
  defaultOrder: AiProvider[]
) {
  const providers = (process.env[environmentName] || defaultOrder.join(","))
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(
      (provider): provider is AiProvider =>
        provider === "gemini" || provider === "groq"
    );

  return [...new Set(providers)];
}

function rotateKeys(keys: string[]) {
  if (keys.length < 2) return keys;
  const start = Math.floor(Math.random() * keys.length);
  return [...keys.slice(start), ...keys.slice(0, start)];
}

function shouldTryNextKey(status: number) {
  return status === 401 || status === 403 || status === 429 || status >= 500;
}

async function responseError(response: Response) {
  try {
    const body = (await response.json()) as {
      error?: { message?: string } | string;
      message?: string;
    };
    if (typeof body.error === "string") return body.error;
    return body.error?.message || body.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function withKeyFallback<T>(
  provider: AiProvider,
  keys: string[],
  run: (key: string) => Promise<T>
) {
  const providerName = PROVIDER_NAMES[provider];

  if (keys.length === 0) {
    throw new AiGatewayError(
      `Server chưa cấu hình API key cho ${providerName}.`,
      503
    );
  }

  let lastError = "Không thể kết nối tới dịch vụ AI.";

  for (const key of rotateKeys(keys)) {
    try {
      return await run(key);
    } catch (error) {
      if (error instanceof AiGatewayError) {
        lastError = error.message;
        if (!shouldTryNextKey(error.status)) throw error;
      } else {
        lastError = "Không thể kết nối tới dịch vụ AI.";
      }
    }
  }

  throw new AiGatewayError(
    `Tất cả API key ${providerName} đều đang lỗi hoặc hết hạn mức. ${lastError}`,
    502
  );
}

function extractGeminiText(body: {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}) {
  return (
    body.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

async function callGemini(params: {
  messages: AiMessage[];
  images?: ImageInput[];
  schema?: Record<string, unknown>;
  model: string;
}) {
  const keys = readKeys("GEMINI_API_KEYS", "GEMINI_API_KEY");

  return withKeyFallback("gemini", keys, async (key) => {
    const system = params.messages
      .filter((message) => message.role === "system")
      .map((message) => message.content)
      .join("\n\n");
    const contents = params.messages
      .filter((message) => message.role !== "system")
      .map((message, index) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [
          { text: message.content },
          ...(index === 0
            ? (params.images || []).map((image) => ({
                inline_data: {
                  mime_type: image.mimeType,
                  data: image.data,
                },
              }))
            : []),
        ],
      }));
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(params.model)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": key,
        },
        body: JSON.stringify({
          ...(system
            ? { system_instruction: { parts: [{ text: system }] } }
            : {}),
          contents,
          generationConfig: {
            temperature: 0.1,
            ...(params.schema
              ? {
                  responseFormat: {
                    text: {
                      mimeType: "application/json",
                      schema: params.schema,
                    },
                  },
                }
              : {}),
          },
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );

    if (!response.ok) {
      throw new AiGatewayError(await responseError(response), response.status);
    }

    const body = (await response.json()) as Parameters<
      typeof extractGeminiText
    >[0];
    const text = extractGeminiText(body);
    if (!text) {
      throw new AiGatewayError("Gemini không trả về nội dung.", 502);
    }

    return {
      text,
      provider: "gemini",
      model: params.model,
    } satisfies ProviderResult;
  });
}

async function callGroq(params: {
  messages: AiMessage[];
  images?: ImageInput[];
  jsonMode?: boolean;
  model: string;
}) {
  const keys = readKeys("GROQ_API_KEYS", "GROQ_API_KEY");

  return withKeyFallback("groq", keys, async (key) => {
    let imagesAdded = false;
    const messages = params.messages.map((message) => {
      if (
        message.role !== "user" ||
        imagesAdded ||
        !params.images?.length
      ) {
        return message;
      }

      imagesAdded = true;
      return {
        role: "user",
        content: [
          { type: "text", text: message.content },
          ...params.images.map((image) => ({
            type: "image_url",
            image_url: {
              url: `data:${image.mimeType};base64,${image.data}`,
            },
          })),
        ],
      };
    });
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: params.model,
          messages,
          temperature: 0.1,
          max_completion_tokens: 1024,
          ...(params.jsonMode
            ? { response_format: { type: "json_object" } }
            : {}),
        }),
        signal: AbortSignal.timeout(45_000),
      }
    );

    if (!response.ok) {
      throw new AiGatewayError(await responseError(response), response.status);
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = body.choices?.[0]?.message?.content?.trim() || "";
    if (!text) {
      throw new AiGatewayError("Groq không trả về nội dung.", 502);
    }

    return {
      text,
      provider: "groq",
      model: params.model,
    } satisfies ProviderResult;
  });
}

function parseCccdResult(result: ProviderResult) {
  try {
    return {
      data: JSON.parse(result.text) as CccdOcrResult,
      provider: result.provider,
      model: result.model,
    };
  } catch {
    throw new AiGatewayError(
      `${PROVIDER_NAMES[result.provider]} trả về kết quả OCR không đúng định dạng JSON.`,
      502
    );
  }
}

function parseMeterResult(result: ProviderResult) {
  try {
    const cleaned = result.text
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0] ?? cleaned;
    const raw = JSON.parse(jsonText) as {
      chi_so?: number | string;
      loai?: string;
      readings?: Array<{
        type?: string;
        value?: number | string;
        reading?: number | string;
        unit?: string;
        confidence?: number | string;
      }>;
      imageQuality?: string | number;
      notes?: string;
    };
    const rawReadings =
      Array.isArray(raw.readings) && raw.readings.length
        ? raw.readings
        : raw.chi_so !== undefined
          ? [
              {
                type: raw.loai,
                value: raw.chi_so,
                unit:
                  String(raw.loai ?? "").toLowerCase().includes("nuoc")
                    ? "m³"
                    : String(raw.loai ?? "").toLowerCase().includes("dien")
                      ? "kWh"
                      : "",
                confidence: 0,
              },
            ]
          : [];
    if (!rawReadings.length) throw new Error("invalid readings");
    const readings = rawReadings.flatMap((reading) => {
      const rawValue = reading.value ?? reading.reading;
      const value =
        typeof rawValue === "number"
          ? rawValue
          : Number(String(rawValue ?? "").replace(",", ".").replace(/[^\d.]/g, ""));
      if (!Number.isFinite(value) || value < 0) return [];

      const rawType = String(reading.type ?? "").toLowerCase();
      const unit = String(reading.unit ?? "");
      const type: MeterOcrResult["readings"][number]["type"] =
        rawType.includes("electric") ||
        rawType.includes("điện") ||
        rawType.includes("dien") ||
        unit.toLowerCase().includes("kwh")
          ? "electric"
          : rawType.includes("water") ||
              rawType.includes("nước") ||
              rawType.includes("nuoc") ||
              unit.includes("m³") ||
              unit.toLowerCase().includes("m3")
            ? "water"
            : "unknown";
      const confidence = Number(reading.confidence ?? 0);
      return [{
        type,
        value,
        unit:
          unit ||
          (type === "electric" ? "kWh" : type === "water" ? "m³" : ""),
        confidence: Number.isFinite(confidence)
          ? Math.max(0, Math.min(100, confidence))
          : 0,
      }];
    });
    const qualityValue = raw.imageQuality;
    const imageQuality: MeterOcrResult["imageQuality"] =
      typeof qualityValue === "number"
        ? qualityValue >= 7
          ? "good"
          : qualityValue >= 3
            ? "blurry"
            : "unreadable"
        : qualityValue === "good" ||
            qualityValue === "blurry" ||
            qualityValue === "unreadable"
          ? qualityValue
          : readings.length
            ? "good"
            : "unreadable";
    const data: MeterOcrResult = {
      readings,
      imageQuality,
      notes: String(raw.notes ?? ""),
    };
    return { data, provider: result.provider, model: result.model };
  } catch {
    throw new AiGatewayError(
      `${PROVIDER_NAMES[result.provider]} trả về kết quả công tơ không đúng định dạng JSON.`,
      502
    );
  }
}

export async function extractCccdFromImages(front: ImageInput, back: ImageInput) {
  const providers = readProviderOrder("AI_VISION_PROVIDER_ORDER", [
    "gemini",
    "groq",
  ]);
  const images = [front, back];
  const messages: AiMessage[] = [
    {
      role: "system",
      content:
        "Bạn là hệ thống OCR CCCD Việt Nam. Chỉ trả về dữ liệu nhìn thấy rõ trên ảnh, không suy đoán.",
    },
    { role: "user", content: cccdPrompt },
  ];
  let lastError: unknown;

  for (const provider of providers) {
    try {
      if (provider === "gemini") {
        const result = await callGemini({
          messages,
          images,
          schema: cccdSchema,
          model: process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash",
        });
        return parseCccdResult(result);
      }

      const result = await callGroq({
        messages,
        images,
        jsonMode: true,
        model:
          process.env.GROQ_VISION_MODEL ||
          "meta-llama/llama-4-scout-17b-16e-instruct",
      });
      return parseCccdResult(result);
    } catch (error) {
      lastError = error;
      logWarning("meter_ocr_provider_failed", {
        provider,
        error: errorMessage(error),
      });
    }
  }

  if (lastError instanceof AiGatewayError) throw lastError;
  throw new AiGatewayError("Không có AI đọc ảnh nào khả dụng.", 503);
}

export async function extractMeterReadingsFromImage(image: ImageInput) {
  const providers = readProviderOrder("AI_VISION_PROVIDER_ORDER", [
    "gemini",
    "groq",
  ]);
  const messages: AiMessage[] = [
    {
      role: "system",
      content:
        "Bạn là OCR chuyên đọc mặt công tơ điện và nước Việt Nam. Chỉ đọc dãy số dùng để chốt tiền, không đọc số sê-ri, năm sản xuất hay thông số kỹ thuật.",
    },
    {
      role: "user",
      content:
        'Đây là ảnh đồng hồ điện hoặc nước. Hãy đọc đúng chỉ số trên ô số chính. Chữ số màu đỏ cuối cùng của công tơ cơ là phần thập phân 1/10. Trả về duy nhất JSON dạng {"chi_so": 4040.0, "loai": "dien"} hoặc {"chi_so": 123.4, "loai": "nuoc"}. Không giải thích, không thêm markdown. Nếu không nhìn rõ, trả {"chi_so": null, "loai": "khong_ro"}.',
    },
  ];
  let lastError: unknown;

  for (const provider of providers) {
    try {
      if (provider === "gemini") {
        return parseMeterResult(
          await callGemini({
            messages,
            images: [image],
            model: process.env.GEMINI_VISION_MODEL || "gemini-3.5-flash",
          })
        );
      }

      return parseMeterResult(
        await callGroq({
          messages,
          images: [image],
          jsonMode: true,
          model:
            process.env.GROQ_VISION_MODEL ||
            "meta-llama/llama-4-scout-17b-16e-instruct",
        })
      );
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof AiGatewayError) throw lastError;
  throw new AiGatewayError("Không có AI đọc công tơ nào khả dụng.", 503);
}


export async function generateAiText(messages: AiMessage[]) {
  const providers = readProviderOrder("AI_TEXT_PROVIDER_ORDER", [
    "gemini",
    "groq",
  ]);
  let lastError: unknown;

  for (const provider of providers) {
    try {
      if (provider === "gemini") {
        return await callGemini({
          messages,
          model: process.env.GEMINI_TEXT_MODEL || "gemini-3.5-flash",
        });
      }

      return await callGroq({
        messages,
        model:
          process.env.GROQ_TEXT_MODEL ||
          "meta-llama/llama-4-scout-17b-16e-instruct",
      });
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof AiGatewayError) throw lastError;
  throw new AiGatewayError("Không có nhà cung cấp AI nào khả dụng.", 503);
}
