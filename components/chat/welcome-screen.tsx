import { RiRobot2Fill, RiBankLine, RiPercentLine, RiExchangeLine, RiQuestionLine } from "@remixicon/react";
import { useLanguage } from "@/hooks/use-language";
import { pickLocalized } from "@/lib/i18n";

interface WelcomeScreenProps {
  onSuggestionClick: (message: string) => void;
}

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
  const { language } = useLanguage();
  const content = pickLocalized(language, {
    english: {
      heading: "Ask in your language",
      description:
        "Ask in English, Hindi, Gujarati, Tamil, or Hinglish. Example: Best FD for Rs 80k for 2 years?",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "Compare SBI vs HDFC FD",
          prompt: "Compare SBI vs HDFC FD",
          description: "Safety, return, and flexibility",
        },
        {
          icon: RiBankLine,
          label: "Best FD for senior citizens",
          prompt: "Best FD for senior citizens",
          description: "Higher-rate options",
        },
        {
          icon: RiPercentLine,
          label: "Is Post Office safer than banks?",
          prompt: "Is Post Office safer than banks for FD?",
          description: "Trust and safety view",
        },
        {
          icon: RiExchangeLine,
          label: "Rs 50,000 FD maturity in 1 year",
          prompt: "Rs 50,000 FD maturity in 1 year",
          description: "Quick estimate",
        },
      ],
    },
    hindi: {
      heading: "नमस्ते",
      description:
        "मैं आपका AI Financial Advisor हूं। Fixed Deposit के बारे में कुछ भी पूछें।",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "FD क्या होता है?",
          prompt: "FD क्या होता है? आसान शब्दों में समझाओ",
          description: "बेसिक्स सीखें",
        },
        {
          icon: RiBankLine,
          label: "50,000 के लिए best FD?",
          prompt: "50,000 के लिए सबसे अच्छे FD विकल्प बताओ",
          description: "सुझाव पाएं",
        },
        {
          icon: RiPercentLine,
          label: "ब्याज दरें समझाएं",
          prompt: "FD ब्याज दरें उदाहरण के साथ समझाओ",
          description: "रिटर्न समझें",
        },
        {
          icon: RiExchangeLine,
          label: "बैंकों की FD तुलना",
          prompt: "टॉप बैंकों के FD विकल्पों की तुलना करो",
          description: "साथ-साथ तुलना",
        },
      ],
    },
    hinglish: {
      heading: "Namaste",
      description:
        "Main aapka AI Financial Advisor hoon. Fixed Deposit ke baare me kuch bhi poochho.",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "FD kya hota hai?",
          prompt: "FD kya hota hai? Simple me samjhao",
          description: "Basics samjho",
        },
        {
          icon: RiBankLine,
          label: "50,000 ke liye best FD?",
          prompt: "50,000 ke liye best FD options batao",
          description: "Recommendations lo",
        },
        {
          icon: RiPercentLine,
          label: "Interest rate samjhao",
          prompt: "FD interest rates example ke sath samjhao",
          description: "Returns samjho",
        },
        {
          icon: RiExchangeLine,
          label: "Bank FD compare",
          prompt: "Top banks ke FD options compare karo",
          description: "Side-by-side analysis",
        },
      ],
    },
    marathi: {
      heading: "नमस्कार",
      description:
        "मी तुमचा AI Financial Advisor आहे. Fixed Deposit बद्दल काहीही विचारा.",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "FD म्हणजे काय?",
          prompt: "FD म्हणजे काय? सोप्या भाषेत समजवा",
          description: "मूलभूत माहिती",
        },
        {
          icon: RiBankLine,
          label: "50,000 साठी सर्वोत्तम FD?",
          prompt: "50,000 साठी सर्वोत्तम FD पर्याय सांगा",
          description: "शिफारसी मिळवा",
        },
        {
          icon: RiPercentLine,
          label: "व्याजदर समजवा",
          prompt: "FD व्याजदर उदाहरणासह समजवा",
          description: "परतावा समजून घ्या",
        },
        {
          icon: RiExchangeLine,
          label: "बँक FD तुलना",
          prompt: "टॉप बँकांचे FD पर्याय तुलना करा",
          description: "एकत्र तुलना",
        },
      ],
    },
    gujarati: {
      heading: "નમસ્તે",
      description:
        "હું તમારો AI Financial Advisor છું. Fixed Deposit વિશે કંઈપણ પૂછો.",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "FD શું છે?",
          prompt: "FD શું છે? સરળ શબ્દોમાં સમજાવો",
          description: "મૂળભૂત જાણો",
        },
        {
          icon: RiBankLine,
          label: "50,000 માટે શ્રેષ્ઠ FD?",
          prompt: "50,000 માટે શ્રેષ્ઠ FD વિકલ્પ જણાવો",
          description: "ભલામણ મેળવો",
        },
        {
          icon: RiPercentLine,
          label: "વ્યાજ દર સમજાવો",
          prompt: "FD વ્યાજ દર ઉદાહરણ સાથે સમજાવો",
          description: "રિટર્ન સમજો",
        },
        {
          icon: RiExchangeLine,
          label: "બેન્ક FD તુલના",
          prompt: "ટોપ બેન્કોના FD વિકલ્પોની તુલના કરો",
          description: "સાઈડ-બાય-સાઈડ વિશ્લેષણ",
        },
      ],
    },
    tamil: {
      heading: "வணக்கம்",
      description:
        "நான் உங்கள் AI Financial Advisor. Fixed Deposit பற்றி எதையும் கேளுங்கள்.",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "FD என்றால் என்ன?",
          prompt: "FD என்றால் என்ன? எளிமையாக விளக்குங்கள்",
          description: "அடிப்படை அறிக",
        },
        {
          icon: RiBankLine,
          label: "50,000க்கு சிறந்த FD?",
          prompt: "50,000க்கு சிறந்த FD விருப்பங்கள் சொல்லுங்கள்",
          description: "பரிந்துரைகள் பெறுங்கள்",
        },
        {
          icon: RiPercentLine,
          label: "வட்டி விகிதம் விளக்கம்",
          prompt: "FD வட்டி விகிதங்களை உதாரணத்துடன் விளக்குங்கள்",
          description: "வருமானம் புரிந்துகொள்ளுங்கள்",
        },
        {
          icon: RiExchangeLine,
          label: "வங்கி FD ஒப்பீடு",
          prompt: "முன்னணி வங்கிகளின் FD விருப்பங்களை ஒப்பிடுங்கள்",
          description: "பக்கம்தோறும் ஒப்பீடு",
        },
      ],
    },
    bhojpuri: {
      heading: "प्रणाम",
      description:
        "हम रउरा AI Financial Advisor बानी। Fixed Deposit के बारे में कुछो पूछीं।",
      suggestions: [
        {
          icon: RiQuestionLine,
          label: "FD का होला?",
          prompt: "FD का होला? आसान तरीका से समझाईं",
          description: "बेसिक सीखीं",
        },
        {
          icon: RiBankLine,
          label: "50,000 खातिर बढ़िया FD?",
          prompt: "50,000 खातिर सबसे बढ़िया FD विकल्प बताईं",
          description: "सुझाव पाइँ",
        },
        {
          icon: RiPercentLine,
          label: "ब्याज दर समझाईं",
          prompt: "FD ब्याज दर उदाहरण से समझाईं",
          description: "रिटर्न बुझीं",
        },
        {
          icon: RiExchangeLine,
          label: "बैंक FD तुलना",
          prompt: "टॉप बैंकन के FD विकल्प तुलना करीं",
          description: "साइड-बाय-साइड तुलना",
        },
      ],
    },
  });

  return (
    <div className="flex min-h-full flex-col items-center justify-start px-4 py-6 sm:justify-center sm:py-8">
      {/* Hero Section */}
      <div className="mb-8 flex flex-col items-center text-center animate-[fadeInUp_0.5s_ease-out_both]">
        <div className="mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <RiRobot2Fill className="size-8" />
        </div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          {content.heading}
        </h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
          {content.description}
        </p>
      </div>

      {/* Suggestion Chips */}
      <div className="grid w-full max-w-md grid-cols-1 gap-2.5 sm:grid-cols-2 animate-[fadeInUp_0.5s_ease-out_0.15s_both]">
        {content.suggestions.map((s) => (
          <button
            key={s.label}
            onClick={() => onSuggestionClick(s.prompt)}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card/60 px-4 py-3 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98]"
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/20">
              <s.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[0.8125rem] font-medium text-foreground truncate">
                {s.label}
              </p>
              <p className="text-[0.6875rem] text-muted-foreground">
                {s.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
