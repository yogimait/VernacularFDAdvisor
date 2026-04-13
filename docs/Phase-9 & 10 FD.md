# **PHASE 9 — CLICKABLE \+ EXECUTABLE UX**

---

## **🎯 Goal**

User:

sirf padhe nahi ❌  
directly action le sake ✅

👉 Chat → Action system

---

# **🧠 1\. Current Limitation**

Abhi:

* Next Step \= text  
* Bank \= static cards

👉 No real interaction

---

# **🧩 2\. Upgrade Concept**

Convert UI into:

AI Response → Interactive Components → User Action

---

# **📁 3\. Core Changes (Frontend)**

---

## **🔹 A. Clickable “Next Step”**

---

### **Step 1: Convert nextStep → action object**

Backend se:

{

  "nextStep": {

    "text": "Select a bank",

    "action": "SELECT\_BANK"

  }

}

---

### **Step 2: Frontend Logic**

In `chat-bubble.tsx`:

* detect if nextStep has action  
* render button instead of text

---

### **Step 3: Action Handler**

Create:

/lib/actions.ts

---

Example mapping:

SELECT\_BANK → open bank options UI

OPEN\_FD → show step-by-step guide

ASK\_DURATION → auto-fill input prompt

---

## **🧠 Insight**

👉 Chat becomes **state machine**

---

# **🔹 B. Clickable Bank Cards**

---

## **Step 1: Add click behavior**

Each bank card:

* onClick → triggers action

---

## **Step 2: Action Types**

VIEW\_DETAILS

START\_FD

COMPARE

---

## **Step 3: UI Response**

On click:

* show modal OR  
* inject new chat message

Example:

“You selected HDFC — want to proceed?”

---

# **🔹 C. Quick Action Buttons (IMPORTANT)**

---

Below chat input:

Add:

* “💰 Invest 50k”  
* “📊 Best FD”  
* “🧠 Explain FD”

---

👉 Pre-filled prompts

---

# **🧩 4\. Backend Support**

---

## **Step 1: Include action hints**

AI response should include:

{

  "actions": \["SELECT\_BANK", "ASK\_MORE"\]

}

---

## **Step 2: Keep it optional**

Frontend should:

* fallback if missing

---

# **🧪 5\. Testing**

---

### **Click bank**

👉 triggers new flow

---

### **Click next step**

👉 continues conversation

---

### **No action case**

👉 fallback text works

---

# **✅ PHASE 9 DONE**

* Clickable next steps  
* Interactive bank cards  
* Action-driven chat

👉 Now UX \= **real product**

---

# **🟢 PHASE 10 — ADVANCED FEATURES**

---

## **🎯 Goal**

Add:

* Voice Input 🎤  
* FD Calculator 📊  
* Language Switch 🌐

👉 \+ polish UI

---

# **🔊 PART 1 — VOICE INPUT (Speech → Text)**

---

## **🧠 Architecture**

Mic → Audio → API → Groq Whisper → Text → Chat

---

# **📁 Implementation**

---

## **Step 1: Frontend Audio Capture**

Use:

* Web API (`MediaRecorder`)

---

### **Flow:**

* click mic button  
* start recording  
* stop → get audio blob

---

## **Step 2: Create API Route**

app/api/transcribe/route.ts

---

## **Step 3: Send Audio**

POST request:

* form-data  
* file: audio

---

## **Step 4: Groq Integration**

Use:

👉 `whisper-large-v3-turbo` (fast \+ cheap)

---

## **Important Config:**

* response\_format: text  
* language: optional

---

## **Step 5: Return Text**

{

  "text": "Mere paas 50k hai"

}

---

## **Step 6: Auto-fill Chat**

* insert into input  
* optionally auto-send

---

# **⚠️ Important**

* limit audio size (\<25MB)  
* handle errors

---

# **🧪 Testing**

* Hindi speech  
* Hinglish speech  
* English speech

---

# **📊 PART 2 — FD CALCULATOR**

---

## **🎯 Goal**

User:

directly returns mile

---

## **🧠 Formula**

Simple FD:

A \= P (1 \+ r/n)^(nt)

---

## **📁 Implementation**

---

## **Step 1: Create util**

/lib/fdCalculator.ts

---

## **Step 2: Inputs**

* amount  
* rate  
* duration

---

## **Step 3: Output**

* maturity amount  
* interest earned

---

## **🧩 Integration**

---

### **Option A: Chat-triggered**

User:

“Calculate FD for 50k”

👉 detect → call calculator

---

### **Option B: UI Widget (BEST)**

Add button:

👉 “📊 Calculate FD”

---

## **Step 4: UI**

Modal / inline:

* input fields  
* result display

---

## **🧠 Bonus**

Also show:

* comparison between banks

---

# **🌐 PART 3 — LANGUAGE SWITCH UI**

---

## **🎯 Goal**

User manually choose:

* English  
* Hindi  
* Hinglish

---

## **📁 Implementation**

---

## **Step 1: Global State**

Use:

/hooks/useLanguage.ts

---

## **Step 2: Store value**

* localStorage  
* default: auto

---

## **Step 3: Pass to backend**

{

  languagePreference: "hinglish"

}

---

## **Step 4: Backend Logic**

Override AI:

* if preference exists → follow it

---

## **⚠️ Important**

Still allow:

* auto mode

---

# **🎨 PART 4 — UI/UX IMPROVEMENTS**

---

## **🔹 A. Input Bar Upgrade**

* mic button  
* quick actions  
* send animation

---

## **🔹 B. Chat Enhancements**

* typing indicator  
* smooth scroll  
* message grouping

---

## **🔹 C. Cards Enhancement**

Bank cards:

* hover effect  
* clickable CTA  
* highlight best option

---

## **🔹 D. Feedback Loop (🔥 killer feature)**

Add:

* 👍 / 👎 buttons

👉 collect feedback

---

## **🔹 E. Loading UX**

Instead of:

“Loading…”

👉 show:

* “Analyzing…”  
* “Finding best FD…”

---

# **🧪 FINAL TESTING**

---

### **Voice → Chat**

works smoothly

---

### **Calculator**

accurate

---

### **Language switch**

consistent

---

### **Actions**

clickable

---

# **✅ PHASE 10 DONE**

* Voice input working  
* FD calculator integrated  
* Language control added  
* UI polished

---

# **🧠 FINAL PRODUCT LEVEL**

| Feature | Level |
| ----- | ----- |
| AI | ✅ |
| UX | ✅ |
| Interaction | ✅ |
| Real utility | ✅ |
| Wow factor | 🔥 |

---

# **🔥 Reality Check**

Ab tera project:

❌ “simple chatbot”  
✅ “AI-powered financial assistant platform”