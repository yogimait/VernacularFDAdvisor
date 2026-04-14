import { RiRobot2Fill } from "@remixicon/react";
import { useId } from "react";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

export function TypingIndicator() {
  const { language } = useLanguage();
  const loadingTexts = pickLocalized(language, {
    english: ["Analyzing your query...", "Finding best options...", "Thinking..."],
    hindi: ["आपका प्रश्न समझ रहे हैं...", "बेहतरीन विकल्प ढूंढ रहे हैं...", "सोच रहे हैं..."],
    hinglish: ["Aapka query analyze kar rahe hain...", "Best options dhoond rahe hain...", "Soch rahe hain..."],
    marathi: ["तुमचा प्रश्न समजत आहोत...", "सर्वोत्तम पर्याय शोधत आहोत...", "विचार करत आहोत..."],
    gujarati: ["તમારો પ્રશ્ન સમજીએ છીએ...", "શ્રેષ્ઠ વિકલ્પો શોધી રહ્યા છીએ...", "વિચાર કરી રહ્યા છીએ..."],
    tamil: ["உங்கள் கேள்வியை பகுப்பாய்வு செய்கிறோம்...", "சிறந்த விருப்பங்களை தேடுகிறோம்...", "சிந்தித்து கொண்டிருக்கிறோம்..."],
    bhojpuri: ["रउरा सवाल समझत बानी...", "सबसे बढ़िया विकल्प खोजत बानी...", "सोचत बानी..."],
  });

  const stableId = useId();
  const index =
    stableId
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0) %
    loadingTexts.length;
  const text = loadingTexts[index];

  return (
    <div className="flex w-full animate-[fadeInUp_0.3s_ease-out_both] gap-2.5">
      {/* Avatar */}
      <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary mt-0.5">
        <RiRobot2Fill className="size-3.5" />
      </div>

      {/* Typing bubble with contextual text */}
      <div className="rounded-xl rounded-bl-sm border border-border bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-primary animate-[typingBounce_1.4s_ease-in-out_infinite]" />
            <span className="size-1.5 rounded-full bg-primary animate-[typingBounce_1.4s_ease-in-out_0.2s_infinite]" />
            <span className="size-1.5 rounded-full bg-primary animate-[typingBounce_1.4s_ease-in-out_0.4s_infinite]" />
          </div>
          <span className="text-[0.6875rem] text-muted-foreground">
            {text}
          </span>
        </div>
      </div>
    </div>
  );
}
