import { calculateFD } from "@/lib/fd-calculator";
import { FD_DATA } from "@/lib/fd-data";
import type {
  BookingAccountStatus,
  BookingInterestType,
  BookingMethod,
  BookingProgress,
  BookingStep,
  FDBookingFlow,
  FDBookingState,
  StructuredResponse,
} from "@/types/chat";

export type BookingLanguage =
  | "english"
  | "hindi"
  | "hinglish"
  | "marathi"
  | "gujarati"
  | "tamil"
  | "bhojpuri";

type BookingLocalizedValues<T> = {
  english: T;
} & Partial<Record<BookingLanguage, T>>;

const BOOKING_LANGUAGE_FALLBACKS: Record<BookingLanguage, BookingLanguage[]> = {
  english: ["english"],
  hindi: ["hindi", "english"],
  hinglish: ["hinglish", "english"],
  marathi: ["marathi", "hindi", "english"],
  gujarati: ["gujarati", "hindi", "english"],
  tamil: ["tamil", "english", "hindi"],
  bhojpuri: ["bhojpuri", "hinglish", "hindi", "english"],
};

function pickBookingText<T>(
  language: BookingLanguage,
  values: BookingLocalizedValues<T>
): T {
  const fallbackChain = BOOKING_LANGUAGE_FALLBACKS[language] ?? ["english"];

  for (const key of fallbackChain) {
    const value = values[key];
    if (value !== undefined) {
      return value;
    }
  }

  return values.english;
}

export interface BookingUpdateInput {
  amount?: number;
  tenureMonths?: number;
  bank?: string;
}

export type FDBookingActionCommand =
  | {
      type: "START_FROM_RECOMMENDATION";
      bank: string;
      tenureMonths?: number;
    }
  | { type: "SELECT_BANK"; bank: string }
  | {
      type: "CONFIRM_DETAILS";
      amount: number;
      tenureMonths: number;
      interestType: BookingInterestType;
    }
  | { type: "SET_ACCOUNT_STATUS"; accountStatus: BookingAccountStatus }
  | { type: "SET_METHOD"; bookingMethod: BookingMethod }
  | { type: "PROCEED_TO_CONFIRMATION" }
  | { type: "EDIT_DETAILS" }
  | { type: "RESTART" }
  | { type: "RESUME" }
  | { type: "SAVE_GUIDE" };

const BOOKING_COMMAND_PREFIX = "__FD_BOOKING__";

const DEFAULT_AMOUNT = 100000;
const DEFAULT_TENURE = 12;
const DEFAULT_INTEREST_TYPE: BookingInterestType = "cumulative";

const BANK_ALIASES: Array<{ pattern: RegExp; canonical: string }> = [
  { pattern: /\bhdfc\b/i, canonical: "HDFC Bank" },
  { pattern: /\bicici\b/i, canonical: "ICICI Bank" },
  { pattern: /\baxis\b/i, canonical: "Axis Bank" },
  { pattern: /\bsbi\b|state bank/i, canonical: "SBI (State Bank of India)" },
  {
    pattern: /\bsuryoday\b/i,
    canonical: "Suryoday Small Finance Bank",
  },
  { pattern: /\bunity\b/i, canonical: "Unity Small Finance Bank" },
  { pattern: /\butkarsh\b/i, canonical: "Utkarsh Small Finance Bank" },
  { pattern: /post\s*office/i, canonical: "Post Office FD" },
];

export const BOOKING_BANK_OPTIONS: string[] = [
  "HDFC Bank",
  "ICICI Bank",
  "SBI (State Bank of India)",
  "Axis Bank",
  "Suryoday Small Finance Bank",
  "Post Office FD",
];

export function createBookingState(
  seed: Partial<FDBookingState> = {}
): FDBookingState {
  return {
    step: seed.step ?? (seed.bank ? "CONFIRM_DETAILS" : "SELECT_BANK"),
    bank: seed.bank,
    amount: seed.amount ?? DEFAULT_AMOUNT,
    tenureMonths: seed.tenureMonths ?? DEFAULT_TENURE,
    interestType: seed.interestType ?? DEFAULT_INTEREST_TYPE,
    accountStatus: seed.accountStatus,
    bookingMethod: seed.bookingMethod,
  };
}

export function isBookingIntentMessage(message: string): boolean {
  const text = message.toLowerCase();
  const bookingPatterns = [
    /(open|book|start|create|setup|set up|do|karna|kholna|kholna hai).*\b(fd|fixed\s*deposit)\b/i,
    /\b(fd|fixed\s*deposit)\b.*(open|book|start|create|karna|kholna)/i,
    /\b(mature|renew|rollover)\b.*\b(fd|fixed\s*deposit)\b/i,
  ];

  return bookingPatterns.some((pattern) => pattern.test(text));
}

export function isBookingRelatedMessage(message: string): boolean {
  const text = message.toLowerCase();
  return /\b(fd|fixed deposit|bank|amount|tenure|month|year|account|kyc|net banking|mobile app|branch|booking|open|book|continue|resume|deposit)\b/i.test(
    text
  );
}

export function isComparisonIntentMessage(message: string): boolean {
  const text = message.toLowerCase();
  return /\b(compare|tulna|best|highest|top|recommend|option|sabse zyada|zyada return)\b/i.test(text);
}

export function extractBankFromText(message: string): string | null {
  for (const alias of BANK_ALIASES) {
    if (alias.pattern.test(message)) {
      return alias.canonical;
    }
  }

  const lowerMessage = message.toLowerCase();
  const exactBank = BOOKING_BANK_OPTIONS.find((bank) =>
    lowerMessage.includes(bank.toLowerCase())
  );

  return exactBank ?? null;
}

export function extractAmountFromText(message: string): number | null {
  const text = message.toLowerCase().replace(/,/g, "");

  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(lakh|lakhs|lac|lacs)/i);
  if (lakhMatch) {
    return Math.round(Number(lakhMatch[1]) * 100000);
  }

  const croreMatch = text.match(/(\d+(?:\.\d+)?)\s*(crore|crores|cr)\b/i);
  if (croreMatch) {
    return Math.round(Number(croreMatch[1]) * 10000000);
  }

  const thousandMatch = text.match(/(\d+(?:\.\d+)?)\s*(k|thousand)\b/i);
  if (thousandMatch) {
    return Math.round(Number(thousandMatch[1]) * 1000);
  }

  const rupeeMatch = text.match(/(?:rs\.?|inr)\s*(\d{3,})(?:\D|$)/i);
  if (rupeeMatch) {
    return Number(rupeeMatch[1]);
  }

  const plainNumberMatch = text.match(/\b(\d{5,})\b/);
  if (plainNumberMatch) {
    return Number(plainNumberMatch[1]);
  }

  return null;
}

export function extractTenureFromText(message: string): number | null {
  const text = message.toLowerCase();

  const yearMatch = text.match(/(\d+(?:\.\d+)?)\s*(year|years|yr|yrs|saal|sal)\b/i);
  if (yearMatch) {
    return Math.max(1, Math.round(Number(yearMatch[1]) * 12));
  }

  const monthMatch = text.match(/(\d+(?:\.\d+)?)\s*(month|months|mon|mahina|mahine)\b/i);
  if (monthMatch) {
    return Math.max(1, Math.round(Number(monthMatch[1])));
  }

  const compactYearMatch = text.match(/\b(\d+)\s*y\b/i);
  if (compactYearMatch) {
    return Math.max(1, Number(compactYearMatch[1]) * 12);
  }

  const compactMonthMatch = text.match(/\b(\d+)\s*m\b/i);
  if (compactMonthMatch) {
    return Math.max(1, Number(compactMonthMatch[1]));
  }

  return null;
}

export function encodeBookingCommand(command: FDBookingActionCommand): string {
  return `${BOOKING_COMMAND_PREFIX}${JSON.stringify(command)}`;
}

export function decodeBookingCommand(
  text: string
): FDBookingActionCommand | null {
  if (!text.startsWith(BOOKING_COMMAND_PREFIX)) {
    return null;
  }

  const payload = text.slice(BOOKING_COMMAND_PREFIX.length);
  try {
    const parsed = JSON.parse(payload) as FDBookingActionCommand;
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

export function getBookingCommandLabel(
  command: FDBookingActionCommand,
  language: BookingLanguage = "english"
): string {
  switch (command.type) {
    case "START_FROM_RECOMMENDATION":
      return pickBookingText(language, {
        english: `Start FD booking with ${command.bank}`,
        hindi: `${command.bank} के साथ FD बुकिंग शुरू करें`,
        hinglish: `${command.bank} ke saath FD booking start karein`,
      });
    case "SELECT_BANK":
      return pickBookingText(language, {
        english: `I want to book FD in ${command.bank}`,
        hindi: `मैं ${command.bank} में FD बुक करना चाहता/चाहती हूं`,
        hinglish: `Mujhe ${command.bank} me FD book karni hai`,
      });
    case "CONFIRM_DETAILS":
      return pickBookingText(language, {
        english: `Confirm Rs ${formatCurrencyINR(command.amount)} for ${command.tenureMonths} months (${command.interestType})`,
        hindi: `Rs ${formatCurrencyINR(command.amount)} को ${command.tenureMonths} महीनों के लिए पुष्टि करें (${command.interestType})`,
        hinglish: `Rs ${formatCurrencyINR(command.amount)} ko ${command.tenureMonths} months ke liye confirm karo (${command.interestType})`,
      });
    case "SET_ACCOUNT_STATUS":
      if (command.accountStatus === "has-account") {
        return pickBookingText(language, {
          english: "I already have an account",
          hindi: "मेरे पास पहले से खाता है",
          hinglish: "Mere paas pehle se account hai",
        });
      }
      return pickBookingText(language, {
        english: "I do not have an account",
        hindi: "मेरे पास खाता नहीं है",
        hinglish: "Mere paas account nahi hai",
      });
    case "SET_METHOD":
      return pickBookingText(language, {
        english: `Proceed with ${formatMethodLabel(command.bookingMethod, language)}`,
        hindi: `${formatMethodLabel(command.bookingMethod, language)} से आगे बढ़ें`,
        hinglish: `${formatMethodLabel(command.bookingMethod, language)} se proceed karein`,
      });
    case "PROCEED_TO_CONFIRMATION":
      return pickBookingText(language, {
        english: "I have completed these steps",
        hindi: "मैंने ये स्टेप पूरे कर लिए हैं",
        hinglish: "Maine ye steps complete kar liye hain",
      });
    case "EDIT_DETAILS":
      return pickBookingText(language, {
        english: "I want to change amount or duration",
        hindi: "मैं राशि या अवधि बदलना चाहता/चाहती हूं",
        hinglish: "Mujhe amount ya duration change karna hai",
      });
    case "RESTART":
      return pickBookingText(language, {
        english: "Start FD booking again",
        hindi: "FD बुकिंग फिर से शुरू करें",
        hinglish: "FD booking fir se start karo",
      });
    case "RESUME":
      return pickBookingText(language, {
        english: "Continue FD setup",
        hindi: "FD सेटअप जारी रखें",
        hinglish: "FD setup continue karo",
      });
    case "SAVE_GUIDE":
      return pickBookingText(language, {
        english: "Save this FD guide",
        hindi: "इस FD गाइड को सेव करें",
        hinglish: "Is FD guide ko save karo",
      });
    default:
      return "";
  }
}

export function applyBookingCommand(
  current: FDBookingState | null,
  command: FDBookingActionCommand
): FDBookingState {
  const activeState = current ? { ...current } : createBookingState();

  switch (command.type) {
    case "START_FROM_RECOMMENDATION":
      return createBookingState({
        ...activeState,
        bank: command.bank,
        tenureMonths: command.tenureMonths ?? activeState.tenureMonths,
        step: "CONFIRM_DETAILS",
      });

    case "SELECT_BANK":
      return {
        ...activeState,
        bank: command.bank,
        step: "CONFIRM_DETAILS",
      };

    case "CONFIRM_DETAILS":
      return {
        ...activeState,
        amount: Math.max(1000, command.amount),
        tenureMonths: Math.max(1, command.tenureMonths),
        interestType: command.interestType,
        step: "ACCOUNT_CHECK",
      };

    case "SET_ACCOUNT_STATUS":
      return {
        ...activeState,
        accountStatus: command.accountStatus,
        step: "METHOD_SELECTION",
      };

    case "SET_METHOD":
      return {
        ...activeState,
        bookingMethod: command.bookingMethod,
        step: "EXECUTION_GUIDE",
      };

    case "PROCEED_TO_CONFIRMATION":
      return {
        ...activeState,
        step: "FINAL_CONFIRMATION",
      };

    case "EDIT_DETAILS":
      return {
        ...activeState,
        step: "CONFIRM_DETAILS",
      };

    case "RESTART":
      return createBookingState();

    case "RESUME":
    case "SAVE_GUIDE":
      return activeState;

    default:
      return activeState;
  }
}

export function applyBookingTextUpdates(
  state: FDBookingState,
  updates: BookingUpdateInput
): FDBookingState {
  const updatedState: FDBookingState = {
    ...state,
    amount: updates.amount ?? state.amount,
    tenureMonths: updates.tenureMonths ?? state.tenureMonths,
    bank: updates.bank ?? state.bank,
  };

  if (updatedState.bank && updatedState.step === "SELECT_BANK") {
    updatedState.step = "CONFIRM_DETAILS";
  }

  return updatedState;
}

export function getBookingProgress(
  step: BookingStep,
  language: BookingLanguage = "english"
): BookingProgress {
  const labels = pickBookingText(language, {
    english: {
      SELECT_BANK: "Select Bank",
      CONFIRM_DETAILS: "Confirm FD Details",
      ACCOUNT_CHECK: "Account Requirement",
      METHOD_SELECTION: "Choose Booking Method",
      EXECUTION_GUIDE: "Execution Guide",
      FINAL_CONFIRMATION: "Final Confirmation",
    },
    hindi: {
      SELECT_BANK: "बैंक चुनें",
      CONFIRM_DETAILS: "FD विवरण पुष्टि करें",
      ACCOUNT_CHECK: "खाता आवश्यकताएं",
      METHOD_SELECTION: "बुकिंग तरीका चुनें",
      EXECUTION_GUIDE: "एक्शन गाइड",
      FINAL_CONFIRMATION: "अंतिम पुष्टि",
    },
    hinglish: {
      SELECT_BANK: "Bank select",
      CONFIRM_DETAILS: "FD details confirm",
      ACCOUNT_CHECK: "Account requirement",
      METHOD_SELECTION: "Booking method choose",
      EXECUTION_GUIDE: "Execution guide",
      FINAL_CONFIRMATION: "Final confirmation",
    },
  });

  return {
    current:
      step === "SELECT_BANK"
        ? 1
        : step === "CONFIRM_DETAILS"
          ? 2
          : step === "ACCOUNT_CHECK"
            ? 3
            : step === "METHOD_SELECTION"
              ? 4
              : step === "EXECUTION_GUIDE"
                ? 5
                : 6,
    total: 6,
    label: labels[step],
  };
}

function formatMethodLabel(
  method: BookingMethod,
  language: BookingLanguage = "english"
): string {
  if (method === "net-banking") {
    return pickBookingText(language, {
      english: "Net Banking",
      hindi: "नेट बैंकिंग",
      hinglish: "Net Banking",
    });
  }

  if (method === "mobile-app") {
    return pickBookingText(language, {
      english: "Mobile App",
      hindi: "मोबाइल ऐप",
      hinglish: "Mobile App",
    });
  }

  return pickBookingText(language, {
    english: "Branch Visit",
    hindi: "ब्रांच विजिट",
    hinglish: "Branch Visit",
  });
}

function getEstimatedRate(state: FDBookingState): number {
  const bankKey = state.bank?.toLowerCase();

  const matches = FD_DATA.filter((option) => {
    if (!bankKey) return true;
    return option.bank.toLowerCase().includes(bankKey);
  });

  const source = matches.length > 0 ? matches : FD_DATA;

  const bestMatch = source.reduce((closest, current) => {
    const currentDiff = Math.abs(current.tenure - state.tenureMonths);
    const closestDiff = Math.abs(closest.tenure - state.tenureMonths);
    return currentDiff < closestDiff ? current : closest;
  });

  return bestMatch.rate;
}

function buildExecutionSteps(
  state: FDBookingState,
  language: BookingLanguage = "english"
): string[] {
  const bank = state.bank ?? "your bank";
  const amount = formatCurrencyINR(state.amount);
  const tenure =
    language === "hindi"
      ? `${state.tenureMonths} महीने`
      : `${state.tenureMonths} months`;
  const interestType = pickBookingText(language, {
    english: state.interestType === "cumulative" ? "Cumulative" : "Non-cumulative",
    hindi: state.interestType === "cumulative" ? "क्यूम्यूलेटिव" : "नॉन-क्यूम्यूलेटिव",
    hinglish:
      state.interestType === "cumulative" ? "Cumulative" : "Non-cumulative",
  });

  if (state.bookingMethod === "mobile-app") {
    return pickBookingText(language, {
      english: [
        `Open ${bank} mobile app and sign in securely.`,
        "Go to Deposits / Fixed Deposit section.",
        `Enter amount Rs ${amount}, tenure ${tenure}, and ${interestType} type.`,
        "Review nominee and payout details, then confirm with OTP.",
        "Download or screenshot confirmation receipt for records.",
      ],
      hindi: [
        `${bank} मोबाइल ऐप खोलें और सुरक्षित लॉगिन करें।`,
        "Deposits / Fixed Deposit सेक्शन में जाएं।",
        `राशि Rs ${amount}, अवधि ${tenure}, और ${interestType} प्रकार दर्ज करें।`,
        "नॉमिनी और पेआउट विवरण जांचें, फिर OTP से पुष्टि करें।",
        "रिकॉर्ड के लिए कन्फर्मेशन रसीद डाउनलोड या स्क्रीनशॉट करें।",
      ],
      hinglish: [
        `${bank} mobile app open karke secure sign in karein.`,
        "Deposits / Fixed Deposit section me jaiye.",
        `Amount Rs ${amount}, tenure ${tenure}, aur ${interestType} type enter karein.`,
        "Nominee aur payout details review karke OTP se confirm karein.",
        "Confirmation receipt download ya screenshot karke save karein.",
      ],
    });
  }

  if (state.bookingMethod === "branch-visit") {
    return pickBookingText(language, {
      english: [
        `Visit nearest ${bank} branch with ID and address proof.`,
        "Tell the banker you want to open an FD and request the FD form.",
        `Fill amount Rs ${amount}, tenure ${tenure}, and ${interestType} option.`,
        "Submit KYC, nominee details, and account debit authorization.",
        "Collect printed FD receipt and note maturity date.",
      ],
      hindi: [
        `ID और address proof के साथ नज़दीकी ${bank} शाखा जाएं।`,
        "बैंकर को FD खोलने की बात बताएं और FD फॉर्म लें।",
        `राशि Rs ${amount}, अवधि ${tenure}, और ${interestType} विकल्प भरें।`,
        "KYC, नॉमिनी विवरण और अकाउंट डेबिट अनुमति जमा करें।",
        "प्रिंटेड FD रसीद लें और मैच्योरिटी तारीख नोट करें।",
      ],
      hinglish: [
        `ID aur address proof ke saath nearest ${bank} branch visit karein.`,
        "Banker ko FD open karne ki request karein aur FD form lein.",
        `Amount Rs ${amount}, tenure ${tenure}, aur ${interestType} option fill karein.`,
        "KYC, nominee details aur account debit authorization submit karein.",
        "Printed FD receipt lein aur maturity date note karein.",
      ],
    });
  }

  return pickBookingText(language, {
    english: [
      `Login to ${bank} net banking portal.`,
      "Open Deposits / Fixed Deposit section.",
      `Enter amount Rs ${amount}, tenure ${tenure}, and ${interestType} option.`,
      "Review nominee details, debit account, and payout settings.",
      "Confirm with OTP and save digital FD receipt.",
    ],
    hindi: [
      `${bank} नेट बैंकिंग पोर्टल में लॉगिन करें।`,
      "Deposits / Fixed Deposit सेक्शन खोलें।",
      `राशि Rs ${amount}, अवधि ${tenure}, और ${interestType} विकल्प दर्ज करें।`,
      "नॉमिनी, डेबिट अकाउंट और पेआउट सेटिंग्स जांचें।",
      "OTP से पुष्टि करें और डिजिटल FD रसीद सेव करें।",
    ],
    hinglish: [
      `${bank} net banking portal me login karein.`,
      "Deposits / Fixed Deposit section open karein.",
      `Amount Rs ${amount}, tenure ${tenure}, aur ${interestType} option enter karein.`,
      "Nominee details, debit account aur payout settings review karein.",
      "OTP se confirm karke digital FD receipt save karein.",
    ],
  });
}

function getStepCta(
  step: BookingStep,
  language: BookingLanguage = "english"
): string {
  const map = pickBookingText(language, {
    english: {
      SELECT_BANK: "Select your preferred bank to continue.",
      CONFIRM_DETAILS: "Confirm amount, tenure, and interest type.",
      ACCOUNT_CHECK: "Tell me if you already have an account.",
      METHOD_SELECTION: "Choose the booking channel you will use.",
      EXECUTION_GUIDE: "Follow steps and continue to final confirmation.",
      FINAL_CONFIRMATION: "Review summary and finish your FD plan.",
    },
    hindi: {
      SELECT_BANK: "जारी रखने के लिए अपना पसंदीदा बैंक चुनें।",
      CONFIRM_DETAILS: "राशि, अवधि और ब्याज प्रकार की पुष्टि करें।",
      ACCOUNT_CHECK: "बताएं क्या आपके पास पहले से खाता है।",
      METHOD_SELECTION: "जिस चैनल से बुक करना है, उसे चुनें।",
      EXECUTION_GUIDE: "स्टेप्स फॉलो करें और अंतिम पुष्टि पर जाएं।",
      FINAL_CONFIRMATION: "सारांश देखें और FD योजना पूरी करें।",
    },
    hinglish: {
      SELECT_BANK: "Continue karne ke liye preferred bank choose karo.",
      CONFIRM_DETAILS: "Amount, tenure aur interest type confirm karo.",
      ACCOUNT_CHECK: "Batayein aapke paas account already hai ya nahi.",
      METHOD_SELECTION: "Jo booking channel use karna hai, use choose karo.",
      EXECUTION_GUIDE: "Steps follow karo aur final confirmation pe jao.",
      FINAL_CONFIRMATION: "Summary review karo aur FD plan finish karo.",
    },
  });

  return map[step];
}

function getStepExplanation(
  state: FDBookingState,
  note?: string,
  reminder?: boolean,
  language: BookingLanguage = "english"
): string {
  if (reminder) {
    return pickBookingText(language, {
      english: "Do you want to continue your FD setup? I have kept your progress saved.",
      hindi: "क्या आप अपनी FD सेटअप जारी रखना चाहते हैं? आपकी प्रोग्रेस सुरक्षित है।",
      hinglish: "Kya aap FD setup continue karna chahte hain? Aapki progress save hai.",
    });
  }

  if (note) {
    return note;
  }

  switch (state.step) {
    case "SELECT_BANK":
      return pickBookingText(language, {
        english: "Great. Let us start a guided FD booking journey. First, choose your bank.",
        hindi: "बहुत बढ़िया। गाइडेड FD बुकिंग शुरू करते हैं। पहले अपना बैंक चुनें।",
        hinglish: "Great. Guided FD booking journey start karte hain. Pehle bank choose karo.",
      });
    case "CONFIRM_DETAILS":
      return pickBookingText(language, {
        english: `Perfect. ${state.bank ?? "Selected bank"} is set. Now confirm amount and tenure.`,
        hindi: `बहुत अच्छा। ${state.bank ?? "चयनित बैंक"} सेट है। अब राशि और अवधि की पुष्टि करें।`,
        hinglish: `Perfect. ${state.bank ?? "Selected bank"} set hai. Ab amount aur tenure confirm karo.`,
      });
    case "ACCOUNT_CHECK":
      return pickBookingText(language, {
        english: "Quick check: FD booking usually needs an active account and KYC.",
        hindi: "एक त्वरित जांच: FD बुकिंग के लिए आमतौर पर सक्रिय खाता और KYC चाहिए।",
        hinglish: "Quick check: FD booking ke liye usually active account aur KYC chahiye.",
      });
    case "METHOD_SELECTION":
      return pickBookingText(language, {
        english: "Good. Now choose how you want to complete the booking process.",
        hindi: "अच्छा। अब चुनें कि आप बुकिंग प्रक्रिया कैसे पूरी करना चाहते हैं।",
        hinglish: "Good. Ab choose karo booking process kaise complete karna hai.",
      });
    case "EXECUTION_GUIDE":
      return pickBookingText(language, {
        english: "Here is your exact step-by-step action list. Follow it in order.",
        hindi: "यह आपकी सटीक स्टेप-बाय-स्टेप एक्शन सूची है। क्रम से फॉलो करें।",
        hinglish: "Yeh aapki exact step-by-step action list hai. Is order me follow karo.",
      });
    case "FINAL_CONFIRMATION":
      return pickBookingText(language, {
        english: "Awesome. Your FD booking plan is ready with final summary.",
        hindi: "शानदार। आपकी FD बुकिंग योजना अंतिम सारांश के साथ तैयार है।",
        hinglish: "Awesome. Aapka FD booking plan final summary ke saath ready hai.",
      });
    default:
      return pickBookingText(language, {
        english: "Let us continue your FD booking flow.",
        hindi: "आइए आपकी FD बुकिंग जारी रखें।",
        hinglish: "Chaliye FD booking flow continue karte hain.",
      });
  }
}

function buildSuggestions(state: FDBookingState, reminder?: boolean): string[] {
  if (reminder) {
    return ["Continue FD setup", "Start again"];
  }

  if (state.step === "FINAL_CONFIRMATION") {
    return ["Change duration", "Compare banks", "Start again"];
  }

  return ["Change duration", "Compare banks"];
}

function buildBookingFlowPayload(
  state: FDBookingState,
  reminder?: boolean,
  language: BookingLanguage = "english"
): FDBookingFlow {
  const progress = getBookingProgress(state.step, language);
  const estimatedRate = getEstimatedRate(state);
  const compoundResult = calculateFD(
    state.amount,
    estimatedRate,
    state.tenureMonths,
    "quarterly"
  );

  const yearlyPayout = Math.round((state.amount * estimatedRate) / 100);

  return {
    title: pickBookingText(language, {
      english: "Guided FD Booking",
      hindi: "गाइडेड FD बुकिंग",
      hinglish: "Guided FD Booking",
    }),
    subtitle:
      state.step === "FINAL_CONFIRMATION"
        ? pickBookingText(language, {
            english: "Your plan is complete. Keep this summary before you proceed.",
            hindi: "आपकी योजना पूरी है। आगे बढ़ने से पहले यह सारांश रखें।",
            hinglish: "Plan complete hai. Aage badhne se pehle yeh summary save rakhein.",
          })
        : pickBookingText(language, {
            english: "Simulation only. No real money transfer happens here.",
            hindi: "यह केवल सिमुलेशन है। यहां कोई वास्तविक धन ट्रांसफर नहीं होता।",
            hinglish: "Yeh sirf simulation hai. Yahan real money transfer nahi hota.",
          }),
    bookingState: state,
    progress,
    bankOptions: BOOKING_BANK_OPTIONS,
    steps:
      state.step === "EXECUTION_GUIDE"
        ? buildExecutionSteps(state, language)
        : undefined,
    cta: getStepCta(state.step, language),
    suggestions: buildSuggestions(state, reminder),
    estimatedRate,
    estimatedMaturity:
      state.interestType === "cumulative"
        ? compoundResult.maturityAmount
        : undefined,
    estimatedYearlyPayout:
      state.interestType === "non-cumulative" ? yearlyPayout : undefined,
  };
}

export function buildBookingStructuredResponse(
  state: FDBookingState,
  options: { note?: string; reminder?: boolean; language?: BookingLanguage } = {}
): StructuredResponse {
  const language = options.language ?? "english";
  const explanation = getStepExplanation(
    state,
    options.note,
    options.reminder,
    language
  );

  return {
    type: "booking_flow",
    explanation,
    nextStep: getStepCta(state.step, language),
    bookingFlow: buildBookingFlowPayload(state, options.reminder, language),
  };
}

export function buildBookingGuideText(
  state: FDBookingState,
  language: BookingLanguage = "english"
): string {
  const rate = getEstimatedRate(state);
  const cumulativeMaturity = calculateFD(
    state.amount,
    rate,
    state.tenureMonths,
    "quarterly"
  ).maturityAmount;

  const title = pickBookingText(language, {
    english: "FD BOOKING GUIDE",
    hindi: "FD बुकिंग गाइड",
    hinglish: "FD BOOKING GUIDE",
  });

  const bankLabel = pickBookingText(language, {
    english: "Bank",
    hindi: "बैंक",
    hinglish: "Bank",
  });

  const amountLabel = pickBookingText(language, {
    english: "Amount",
    hindi: "राशि",
    hinglish: "Amount",
  });

  const tenureLabel = pickBookingText(language, {
    english: "Tenure",
    hindi: "अवधि",
    hinglish: "Tenure",
  });

  const typeLabel = pickBookingText(language, {
    english: "Type",
    hindi: "प्रकार",
    hinglish: "Type",
  });

  const methodLabel = pickBookingText(language, {
    english: "Method",
    hindi: "तरीका",
    hinglish: "Method",
  });

  const estimatedRateLabel = pickBookingText(language, {
    english: "Estimated rate",
    hindi: "अनुमानित रेट",
    hinglish: "Estimated rate",
  });

  const estimatedMaturityLabel = pickBookingText(language, {
    english: "Estimated maturity (cumulative)",
    hindi: "अनुमानित मैच्योरिटी (क्यूम्यूलेटिव)",
    hinglish: "Estimated maturity (cumulative)",
  });

  const executionStepsLabel = pickBookingText(language, {
    english: "Execution steps:",
    hindi: "एक्शन स्टेप्स:",
    hinglish: "Execution steps:",
  });

  const notSelected = pickBookingText(language, {
    english: "Not selected",
    hindi: "चयन नहीं हुआ",
    hinglish: "Not selected",
  });

  const lines = [
    title,
    `${bankLabel}: ${state.bank ?? notSelected}`,
    `${amountLabel}: Rs ${formatCurrencyINR(state.amount)}`,
    `${tenureLabel}: ${state.tenureMonths} ${language === "hindi" ? "महीने" : "months"}`,
    `${typeLabel}: ${state.interestType}`,
    `${methodLabel}: ${state.bookingMethod ? formatMethodLabel(state.bookingMethod, language) : notSelected}`,
    `${estimatedRateLabel}: ${rate}% p.a. (approx)`,
    `${estimatedMaturityLabel}: Rs ${formatCurrencyINR(cumulativeMaturity)}`,
    "",
    executionStepsLabel,
    ...buildExecutionSteps(state, language).map(
      (step, index) => `${index + 1}. ${step}`
    ),
  ];

  return lines.join("\n");
}

export function formatCurrencyINR(value: number): string {
  return Math.round(value).toLocaleString("en-IN");
}
