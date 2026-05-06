"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiCalculatorLine,
  RiChat3Line,
  RiCompass3Line,
  RiLineChartLine,
  RiPlayCircleLine,
  RiRobot2Line,
  RiShieldCheckLine,
  RiStarLine,
} from "@remixicon/react";
import { FD_DATA } from "@/lib/fd-data";
import { calculateFD } from "@/lib/fd-calculator";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSessionStorageValue } from "@/hooks/use-session-storage-value";
import { useLanguage, type Language } from "@/hooks/use-language";
import {
  BOOKING_STATE_KEY,
  LAST_CALC_ACTIVITY_KEY,
  LAST_CHAT_ACTIVITY_KEY,
  type LastCalculationActivity,
  type LastChatActivity,
} from "@/lib/chat-events";
import { openChatWithMessage } from "@/lib/chat-navigation";
import { pickLocalized } from "@/lib/i18n";
import type { FDBookingState } from "@/types/chat";

function formatTimeAgo(timestamp: number, language: Language): string {
  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));

  if (diffMinutes < 60) {
    if (language === "hi") return `${diffMinutes} मिनट पहले`;
    if (language === "mr") return `${diffMinutes} मिनिटांपूर्वी`;
    if (language === "gu") return `${diffMinutes} મિનિટ પહેલાં`;
    if (language === "ta") return `${diffMinutes} நிமிடங்களுக்கு முன்`;
    if (language === "bho") return `${diffMinutes} मिनट पहिले`;
    if (language === "hinglish") return `${diffMinutes} min pehle`;
    return `${diffMinutes} min ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    if (language === "hi") return `${diffHours} घंटे पहले`;
    if (language === "mr") return `${diffHours} तासांपूर्वी`;
    if (language === "gu") return `${diffHours} કલાક પહેલાં`;
    if (language === "ta") return `${diffHours} மணி நேரத்திற்கு முன்`;
    if (language === "bho") return `${diffHours} घंटा पहिले`;
    if (language === "hinglish") return `${diffHours} hour pehle`;
    return `${diffHours} hour ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (language === "hi") return `${diffDays} दिन पहले`;
  if (language === "mr") return `${diffDays} दिवसांपूर्वी`;
  if (language === "gu") return `${diffDays} દિવસ પહેલાં`;
  if (language === "ta") return `${diffDays} நாட்களுக்கு முன்`;
  if (language === "bho") return `${diffDays} दिन पहिले`;
  if (language === "hinglish") return `${diffDays} day pehle`;
  return `${diffDays} day ago`;
}

export function HomeDashboardPage() {
  const router = useRouter();
  const { language } = useLanguage();
  const hour = useSyncExternalStore(
    () => () => {},
    () => new Date().getHours(),
    () => 12
  );

  const bookingState = useSessionStorageValue<FDBookingState | null>(
    BOOKING_STATE_KEY,
    (raw) => JSON.parse(raw) as FDBookingState,
    null
  );

  const lastChat = useSessionStorageValue<LastChatActivity | null>(
    LAST_CHAT_ACTIVITY_KEY,
    (raw) => JSON.parse(raw) as LastChatActivity,
    null
  );

  const lastCalculation = useSessionStorageValue<LastCalculationActivity | null>(
    LAST_CALC_ACTIVITY_KEY,
    (raw) => JSON.parse(raw) as LastCalculationActivity,
    null
  );

  const text = pickLocalized(language, {
    english: {
      greetingMap: {
        morning: "Good Morning",
        afternoon: "Good Afternoon",
        evening: "Good Evening",
      },
      dashboard: "Dashboard",
      welcome: "grow your savings with smarter FD decisions",
      intro:
        "Compare rates, estimate returns, check safety, and open the right Fixed Deposit in minutes.",
      goToChat: "Ask AI Advisor",
      exploreFd: "Explore Best Rates",
      openFdFlow: "Start FD Journey",
      start: "Explore Now",
      primaryActions: [
        {
          title: "New to Fixed Deposits?",
          description:
            "Learn FD basics, lock-in, premature withdrawal, tax, and returns in 2 minutes.",
          message: "Explain FD basics, lock-in, penalty, and tax in 2 minutes",
        },
        {
          title: "Find best FD for Rs 50,000 to Rs 5 lakh",
          description: "See highest-return and safest options based on your amount.",
          message: "Where should I invest Rs 1 lakh safely?",
        },
        {
          title: "Compare trusted banks",
          description: "Check SBI, HDFC, ICICI, Post Office, and SFB options together.",
          message: "Compare SBI, HDFC, ICICI, and Post Office FD options",
        },
        {
          title: "Estimate maturity instantly",
          description: "Know your final amount before investing.",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "Smart Suggestions",
      smartSuggestionsDescription: "Tap one and get advisor-style guidance instantly.",
      smartSuggestions: [
        "Where should I invest Rs 1 lakh safely?",
        "Best senior citizen FD today",
        "Highest 1-year FD with low risk",
        "Tax-saving FD vs normal FD",
      ],
      continueBookingTitle: "Continue your FD booking",
      step: "Step",
      bank: "Bank",
      notSelected: "Not selected",
      continueBooking: "Continue Booking",
      continueBookingPrompt: "Continue FD setup",
      recentActivity: "Recent Activity",
      lastChat: "Last chat",
      noRecentChat: "No recent chat yet.",
      noRecentCalc: "No recent calculation yet.",
      months: "months",
      maturity: "Maturity",
      bottomHint:
        "Rates are based on indexed public data. Final bank rates may change; DICGC coverage applies as per rules.",
      askAssistant: "Find My Best Option",
    },
    hindi: {
      greetingMap: {
        morning: "सुप्रभात",
        afternoon: "नमस्कार",
        evening: "शुभ संध्या",
      },
      dashboard: "डैशबोर्ड",
      welcome: "FD Advisor में आपका स्वागत है",
      intro:
        "गाइडेड बुकिंग, बैंक खोज, तुलना और जल्दी कैलकुलेशन के लिए आपका हाइब्रिड असिस्टेंट।",
      goToChat: "चैट पर जाएं",
      exploreFd: "FD खोजें",
      openFdFlow: "FD खोलें",
      start: "शुरू करें",
      primaryActions: [
        {
          title: "FD क्या है?",
          description: "FD की आसान जानकारी से शुरुआत",
          message: "FD क्या होता है? आसान शब्दों में समझाओ",
        },
        {
          title: "मेरी राशि के लिए best FD",
          description: "पर्सनलाइज्ड टॉप विकल्प पाएं",
          message: "1 साल के लिए 1,00,000 पर best FD options बताओ",
        },
        {
          title: "टॉप बैंकों की तुलना",
          description: "रिटर्न और सुरक्षा साथ में देखें",
          message: "मेरी राशि और अवधि के लिए FD विकल्पों की तुलना करो",
        },
        {
          title: "रिटर्न कैलकुलेट करें",
          description: "मॅच्योरिटी और ब्याज तुरंत देखें",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "स्मार्ट सुझाव",
      smartSuggestionsDescription: "आम यूज़र्स के लिए लोकप्रिय शॉर्टकट।",
      smartSuggestions: [
        "शुरुआती लोगों के लिए best FD विकल्प",
        "मजबूत भरोसे वाले सुरक्षित FD विकल्प",
        "हाई रिटर्न FD के साथ जोखिम समझाएं",
      ],
      continueBookingTitle: "अपनी FD बुकिंग जारी रखें",
      step: "स्टेप",
      bank: "बैंक",
      notSelected: "चयन नहीं हुआ",
      continueBooking: "बुकिंग जारी रखें",
      continueBookingPrompt: "FD setup जारी रखें",
      recentActivity: "हाल की गतिविधि",
      lastChat: "पिछली चैट",
      noRecentChat: "कोई हाल की चैट नहीं।",
      noRecentCalc: "कोई हाल की कैलकुलेशन नहीं।",
      months: "महीने",
      maturity: "मैच्योरिटी",
      bottomHint: "कहां से शुरू करें समझ नहीं आ रहा? चैट असिस्टेंट स्टेप-बाय-स्टेप गाइड करेगा।",
      askAssistant: "असिस्टेंट से पूछें",
    },
    hinglish: {
      greetingMap: {
        morning: "Good Morning",
        afternoon: "Good Afternoon",
        evening: "Good Evening",
      },
      dashboard: "Dashboard",
      welcome: "FD Advisor me aapka welcome hai",
      intro:
        "Guided booking, bank explore, compare aur quick calculation ke liye aapka hybrid assistant.",
      goToChat: "Chat pe jao",
      exploreFd: "Explore FD",
      openFdFlow: "Open FD Flow",
      start: "Start",
      primaryActions: [
        {
          title: "FD kya hai?",
          description: "Simple FD basics se start karo",
          message: "FD kya hota hai? Simple me samjhao",
        },
        {
          title: "Mere amount ke liye best FD",
          description: "Personalized top options pao",
          message: "1 year ke liye 1,00,000 par best FD options batao",
        },
        {
          title: "Top banks compare karo",
          description: "Return aur safety saath me dekho",
          message: "Mere amount aur tenure ke liye FD options compare karo",
        },
        {
          title: "Returns calculate karo",
          description: "Maturity aur interest instant dekho",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "Smart Suggestions",
      smartSuggestionsDescription: "Common users ke liye popular shortcuts.",
      smartSuggestions: [
        "Beginners ke liye best FD options",
        "Strong trust wale safe FD options",
        "High return FD with risk explain",
      ],
      continueBookingTitle: "Apni FD booking continue karo",
      step: "Step",
      bank: "Bank",
      notSelected: "Select nahi hua",
      continueBooking: "Continue Booking",
      continueBookingPrompt: "Continue FD setup",
      recentActivity: "Recent Activity",
      lastChat: "Last chat",
      noRecentChat: "Abhi recent chat nahi hai.",
      noRecentCalc: "Abhi recent calculation nahi hai.",
      months: "months",
      maturity: "Maturity",
      bottomHint: "Start kahan se karein? Chat assistant aapko step-by-step guide karega.",
      askAssistant: "Assistant se poochho",
    },
    marathi: {
      greetingMap: {
        morning: "शुभ प्रभात",
        afternoon: "नमस्कार",
        evening: "शुभ संध्या",
      },
      dashboard: "डॅशबोर्ड",
      welcome: "FD Advisor मध्ये तुमचे स्वागत आहे",
      intro:
        "मार्गदर्शित बुकिंग, बँक शोध, तुलना आणि जलद कॅल्क्युलेशनसाठी तुमचा हायब्रिड असिस्टंट.",
      goToChat: "चॅटला जा",
      exploreFd: "FD शोधा",
      openFdFlow: "FD उघडा फ्लो",
      start: "सुरू करा",
      primaryActions: [
        {
          title: "FD म्हणजे काय?",
          description: "सोप्या FD बेसिक्सपासून सुरुवात करा",
          message: "FD म्हणजे काय? सोप्या भाषेत समजवा",
        },
        {
          title: "माझ्या रकमेवर सर्वोत्तम FD",
          description: "वैयक्तिकृत टॉप पर्याय मिळवा",
          message: "1 वर्षासाठी 1,00,000 साठी सर्वोत्तम FD पर्याय सांगा",
        },
        {
          title: "टॉप बँक तुलना",
          description: "परतावा आणि सुरक्षा एकत्र पाहा",
          message: "माझ्या रकमे आणि कालावधीसाठी FD पर्याय तुलना करा",
        },
        {
          title: "परतावा कॅल्क्युलेट करा",
          description: "मॅच्युरिटी आणि व्याज लगेच पाहा",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "स्मार्ट सूचना",
      smartSuggestionsDescription: "सामान्य वापरकर्त्यांसाठी लोकप्रिय शॉर्टकट.",
      smartSuggestions: [
        "नवशिक्यांसाठी सर्वोत्तम FD पर्याय",
        "विश्वासार्ह सुरक्षित FD पर्याय",
        "उच्च परताव्यासह जोखीम समजवा",
      ],
      continueBookingTitle: "तुमची FD बुकिंग पुढे चालू ठेवा",
      step: "स्टेप",
      bank: "बँक",
      notSelected: "निवडलेले नाही",
      continueBooking: "बुकिंग सुरू ठेवा",
      continueBookingPrompt: "FD सेटअप पुढे चालू ठेवा",
      recentActivity: "अलीकडील क्रियाकलाप",
      lastChat: "शेवटचा चॅट",
      noRecentChat: "अजून अलीकडील चॅट नाही.",
      noRecentCalc: "अजून अलीकडील कॅल्क्युलेशन नाही.",
      months: "महिने",
      maturity: "मॅच्युरिटी",
      bottomHint: "कुठून सुरुवात करावी? चॅट असिस्टंट तुम्हाला स्टेप-बाय-स्टेप मार्गदर्शन करेल.",
      askAssistant: "असिस्टंटला विचारा",
    },
    gujarati: {
      greetingMap: {
        morning: "સુપ્રભાત",
        afternoon: "નમસ્તે",
        evening: "શુભ સાંજ",
      },
      dashboard: "ડેશબોર્ડ",
      welcome: "FD Advisor માં આપનું સ્વાગત છે",
      intro:
        "ગાઇડેડ બુકિંગ, બેન્ક શોધ, તુલના અને ઝડપી કેલ્ક્યુલેશન માટે તમારો હાઇબ્રિડ સહાયક.",
      goToChat: "ચેટ પર જાઓ",
      exploreFd: "FD શોધો",
      openFdFlow: "FD ઓપન ફ્લો",
      start: "શરૂ કરો",
      primaryActions: [
        {
          title: "FD શું છે?",
          description: "સરળ FD મૂળભૂતથી શરૂઆત કરો",
          message: "FD શું છે? સરળ ભાષામાં સમજાવો",
        },
        {
          title: "મારી રકમ માટે શ્રેષ્ઠ FD",
          description: "વ્યક્તિગત ટોપ વિકલ્પો મેળવો",
          message: "1 વર્ષ માટે 1,00,000 પર શ્રેષ્ઠ FD વિકલ્પ બતાવો",
        },
        {
          title: "ટોપ બેન્કો તુલના કરો",
          description: "રિટર્ન અને સુરક્ષા સાથે જુઓ",
          message: "મારી રકમ અને અવધિ માટે FD વિકલ્પો તુલના કરો",
        },
        {
          title: "રિટર્ન ગણો",
          description: "મેચ્યોરિટી અને વ્યાજ તરત જુઓ",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "સ્માર્ટ સૂચનો",
      smartSuggestionsDescription: "સામાન્ય વપરાશકર્તા માટે લોકપ્રિય શોર્ટકટ્સ.",
      smartSuggestions: [
        "શરૂઆત કરનાર માટે શ્રેષ્ઠ FD વિકલ્પો",
        "મજબૂત વિશ્વાસ સાથે સુરક્ષિત FD વિકલ્પો",
        "ઉચ્ચ રિટર્ન સાથે જોખમ સમજાવો",
      ],
      continueBookingTitle: "તમારી FD બુકિંગ ચાલુ રાખો",
      step: "સ્ટેપ",
      bank: "બેંક",
      notSelected: "પસંદ નથી",
      continueBooking: "બુકિંગ ચાલુ રાખો",
      continueBookingPrompt: "FD સેટઅપ ચાલુ રાખો",
      recentActivity: "તાજેતરની પ્રવૃત્તિ",
      lastChat: "છેલ્લી ચેટ",
      noRecentChat: "હજુ સુધી નવી ચેટ નથી.",
      noRecentCalc: "હજુ સુધી નવી ગણતરી નથી.",
      months: "મહિના",
      maturity: "મેચ્યોરિટી",
      bottomHint: "ક્યાંથી શરૂ કરવું ખબર નથી? ચેટ સહાયક તમને પગલું-દર-પગલું માર્ગદર્શન આપશે.",
      askAssistant: "સહાયકને પૂછો",
    },
    tamil: {
      greetingMap: {
        morning: "காலை வணக்கம்",
        afternoon: "வணக்கம்",
        evening: "மாலை வணக்கம்",
      },
      dashboard: "டாஷ்போர்டு",
      welcome: "FD Advisor க்கு வரவேற்கிறோம்",
      intro:
        "வழிகாட்டிய பதிவு, வங்கி தேடல், ஒப்பீடு மற்றும் விரைவு கணக்கீடுகளுக்கான உங்கள் கலப்பு உதவியாளர்.",
      goToChat: "அரட்டைக்கு செல்லவும்",
      exploreFd: "FD ஆராயுங்கள்",
      openFdFlow: "FD திறப்பு நடைமுறை",
      start: "தொடங்கு",
      primaryActions: [
        {
          title: "FD என்றால் என்ன?",
          description: "எளிய FD அடிப்படைகளில் தொடங்குங்கள்",
          message: "FD என்றால் என்ன? எளிய முறையில் விளக்கவும்",
        },
        {
          title: "என் தொகைக்கு சிறந்த FD",
          description: "தனிப்பயன் சிறந்த விருப்பங்களை பெறுங்கள்",
          message: "1 ஆண்டுக்கு 1,00,000க்கு சிறந்த FD விருப்பங்களை கூறவும்",
        },
        {
          title: "முன்னணி வங்கிகளை ஒப்பிடு",
          description: "வருமானமும் பாதுகாப்பும் ஒன்றாக பார்க்கவும்",
          message: "என் தொகை மற்றும் காலத்திற்கு FD விருப்பங்களை ஒப்பிடுங்கள்",
        },
        {
          title: "வருமானம் கணக்கிடு",
          description: "முதிர்வு மற்றும் வட்டியை உடனே பாருங்கள்",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "ஸ்மார்ட் பரிந்துரைகள்",
      smartSuggestionsDescription: "பொதுவான பயனர்களுக்கான பிரபல விரைவு தேர்வுகள்.",
      smartSuggestions: [
        "தொடக்க நிலைக்கு சிறந்த FD விருப்பங்கள்",
        "நம்பகத்தன்மை அதிகமான பாதுகாப்பான FD விருப்பங்கள்",
        "அதிக வருமான FD மற்றும் ஆபத்து விளக்கம்",
      ],
      continueBookingTitle: "உங்கள் FD பதிவை தொடரவும்",
      step: "படி",
      bank: "வங்கி",
      notSelected: "தேர்வு செய்யப்படவில்லை",
      continueBooking: "பதிவை தொடரவும்",
      continueBookingPrompt: "FD அமைப்பை தொடரவும்",
      recentActivity: "சமீப செயல்பாடு",
      lastChat: "கடைசி அரட்டை",
      noRecentChat: "சமீப அரட்டை இல்லை.",
      noRecentCalc: "சமீப கணக்கீடு இல்லை.",
      months: "மாதங்கள்",
      maturity: "முதிர்வு",
      bottomHint: "எங்கே தொடங்குவது தெரியவில்லையா? அரட்டை உதவியாளர் படிப்படியாக வழிகாட்டுவார்.",
      askAssistant: "உதவியாளரை கேளுங்கள்",
    },
    bhojpuri: {
      greetingMap: {
        morning: "सुप्रभात",
        afternoon: "नमस्कार",
        evening: "शुभ संझा",
      },
      dashboard: "डैशबोर्ड",
      welcome: "FD Advisor में रउरा स्वागत बा",
      intro:
        "गाइडेड बुकिंग, बैंक खोज, तुलना आ जल्दी कैलकुलेशन खातिर रउरा हाइब्रिड असिस्टेंट।",
      goToChat: "चैट पर जाईं",
      exploreFd: "FD खोजीं",
      openFdFlow: "FD खोलल फ्लो",
      start: "शुरू करीं",
      primaryActions: [
        {
          title: "FD का होला?",
          description: "सरल FD बेसिक से शुरुआत करीं",
          message: "FD का होला? आसान तरीका से समझाईं",
        },
        {
          title: "हमरा राशि खातिर बढ़िया FD",
          description: "पर्सनल टॉप विकल्प पाइं",
          message: "1 साल खातिर 1,00,000 पर बढ़िया FD विकल्प बताईं",
        },
        {
          title: "टॉप बैंक तुलना करीं",
          description: "रिटर्न आ सुरक्षा साथ में देखीं",
          message: "हमरा राशि आ अवधि खातिर FD विकल्प तुलना करीं",
        },
        {
          title: "रिटर्न कैलकुलेट करीं",
          description: "मैच्योरिटी आ ब्याज तुरंत देखीं",
          route: "/calculator",
        },
      ],
      smartSuggestionsTitle: "स्मार्ट सुझाव",
      smartSuggestionsDescription: "आम यूजर खातिर लोकप्रिय शॉर्टकट।",
      smartSuggestions: [
        "नया यूजर खातिर बढ़िया FD विकल्प",
        "मजबूत भरोसा वाला सुरक्षित FD विकल्प",
        "हाई रिटर्न FD के साथ जोखिम समझाईं",
      ],
      continueBookingTitle: "अपन FD बुकिंग जारी रखीं",
      step: "स्टेप",
      bank: "बैंक",
      notSelected: "चयन नइखे",
      continueBooking: "बुकिंग जारी रखीं",
      continueBookingPrompt: "FD सेटअप जारी रखीं",
      recentActivity: "हाल के गतिविधि",
      lastChat: "पिछला चैट",
      noRecentChat: "अभी हाल के चैट नइखे।",
      noRecentCalc: "अभी हाल के कैलकुलेशन नइखे।",
      months: "महीना",
      maturity: "मैच्योरिटी",
      bottomHint: "कहाँ से शुरुआत करीं? चैट असिस्टेंट रउरा के स्टेप-बाय-स्टेप गाइड करी।",
      askAssistant: "असिस्टेंट से पूछीं",
    },
  });

  const localizedGreeting =
    hour < 12
      ? text.greetingMap.morning
      : hour < 17
        ? text.greetingMap.afternoon
        : text.greetingMap.evening;

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 lg:max-w-6xl">
        <Card className="border border-border bg-card/80">
          <CardHeader>
            <div className="mb-1 flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/15 text-primary">
                <RiRobot2Line className="size-4" />
              </div>
              <Badge variant="outline">{text.dashboard}</Badge>
            </div>
            <CardTitle>{localizedGreeting}, {text.welcome}</CardTitle>
            <CardDescription>
              {text.intro}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => router.push("/chat")}>{text.goToChat}</Button>
              <Button variant="outline" onClick={() => router.push("/explore")}>{text.exploreFd}</Button>
              <Button variant="outline" onClick={() => router.push("/open-fd")}>{text.openFdFlow}</Button>
            </div>
          </CardFooter>
        </Card>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {text.primaryActions.map((action) => (
            <Card key={action.title} className="border border-border bg-card/70">
              <CardHeader>
                <CardTitle className="text-sm">{action.title}</CardTitle>
                <CardDescription>{action.description}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-0">
                <Button
                  variant="outline"
                  className="gap-1"
                  onClick={() => {
                    if (action.route) {
                      router.push(action.route);
                      return;
                    }

                    if (action.message) {
                      openChatWithMessage(router, action.message);
                    }
                  }}
                >
                  {text.start}
                  <RiArrowRightLine className="size-3.5" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Desktop 2-column: suggestions + top picks */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr,1fr]">

        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <RiCompass3Line className="size-4 text-primary" />
              {text.smartSuggestionsTitle}
            </CardTitle>
            <CardDescription>{text.smartSuggestionsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {text.smartSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => openChatWithMessage(router, suggestion)}
                className="rounded-full border border-border bg-background/70 px-3 py-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {suggestion}
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Today's Top Picks - dynamic from FD_DATA */}
        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <RiStarLine className="size-4 text-primary" />
              {pickLocalized(language, {
                english: "Today's Top Rates",
                hindi: "आज की टॉप दरें",
                hinglish: "Aaj ki Top Rates",
                marathi: "आजचे टॉप दर",
                gujarati: "આજના ટોચના દર",
                tamil: "இன்றைய சிறந்த விகிதங்கள்",
                bhojpuri: "आज के टॉप रेट",
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {FD_DATA.filter(fd => fd.tenure === 12)
              .sort((a, b) => b.rate - a.rate)
              .slice(0, 3)
              .map((fd) => {
                const proj = calculateFD(100000, fd.rate, fd.tenure, "quarterly");
                return (
                  <div
                    key={`${fd.bank}-${fd.tenure}`}
                    className="flex items-center justify-between rounded-md border border-border bg-background/70 px-3 py-2 transition-colors hover:border-primary/30"
                  >
                    <div>
                      <p className="text-xs font-semibold text-foreground">{fd.bank}</p>
                      <p className="text-[0.625rem] text-muted-foreground">
                        {fd.tenure}m • Rs {proj.maturityAmount.toLocaleString("en-IN")} on Rs 1L
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-primary/10 text-primary border-primary/30">{fd.rate}%</Badge>
                      <Badge variant="outline" className="gap-0.5 text-[0.5625rem]">
                        <RiShieldCheckLine className="size-2.5" />
                        DICGC
                      </Badge>
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
        {/* end 2-col grid */}
        </div>

        {bookingState && (
          <Card className="border border-primary/25 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm text-primary">
                <RiPlayCircleLine className="size-4" />
                {text.continueBookingTitle}
              </CardTitle>
              <CardDescription>
                {text.step}: {bookingState.step.replaceAll("_", " ")} | {text.bank}: {bookingState.bank ?? text.notSelected}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <Button
                onClick={() =>
                  openChatWithMessage(
                    router,
                    text.continueBookingPrompt
                  )
                }
              >
                {text.continueBooking}
              </Button>
            </CardFooter>
          </Card>
        )}

        <Card className="border border-border bg-card/70">
          <CardHeader>
            <CardTitle className="text-sm">{text.recentActivity}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <RiChat3Line className="size-3.5" />
              </div>
              {lastChat ? (
                <div>
                  <p className="text-xs text-foreground">{lastChat.message}</p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {text.lastChat}: {formatTimeAgo(lastChat.timestamp, language)}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{text.noRecentChat}</p>
              )}
            </div>

            <Separator />

            <div className="flex items-start gap-2">
              <div className="mt-0.5 flex size-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <RiCalculatorLine className="size-3.5" />
              </div>
              {lastCalculation ? (
                <div>
                  <p className="text-xs text-foreground">
                    Rs {lastCalculation.principal.toLocaleString("en-IN")} for {lastCalculation.tenureMonths} {text.months}
                  </p>
                  <p className="text-[0.6875rem] text-muted-foreground">
                    {text.maturity} Rs {lastCalculation.maturityAmount.toLocaleString("en-IN")}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{text.noRecentCalc}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/60">
          <CardContent className="flex flex-wrap items-center justify-between gap-2 pt-4">
            <p className="text-xs text-muted-foreground">
              {text.bottomHint}
            </p>
            <Button variant="outline" className="gap-1" onClick={() => router.push("/chat")}> 
              {text.askAssistant}
              <RiArrowRightLine className="size-3.5" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
