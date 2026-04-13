# **PHASE 3 — AI BACKEND INTEGRATION (Next.js Native)**

---

## **🎯 Goal**

Frontend chat → backend API → AI → response → UI

👉 End-to-end working system

---

# **🧩 1\. Architecture (Simple but Correct)**

Chat UI (React)

   ↓

Next.js API Route (/api/chat)

   ↓

LLM (OpenAI / Groq)

   ↓

Response

   ↓

Frontend render

👉 No separate Express server needed  
👉 Everything runs on **port 3000**

---

# **📁 2\. Backend Setup (IMPORTANT)**

## **Step 1: Create API Route**

Inside your project:

app/api/chat/route.ts

👉 This will be your backend endpoint

---

## **Step 2: Define Responsibility**

This route should ONLY:

1. Receive user message  
2. Send to AI  
3. Return response

👉 No UI logic  
👉 No formatting logic (keep backend clean)

---

## **📁 3\. Request Flow Design**

Frontend will send:

POST /api/chat

{

  message: "FD kya hota hai?"

}

---

Backend will return:

{

  reply: "FD ek investment option hai..."

}

---

## **🧠 4\. AI Integration Logic**

Inside your API route:

### **Step-by-step flow:**

---

### **1\. Extract message**

* read from request body

---

### **2\. Prepare prompt**

You should:

* wrap user message with instruction

Example logic:

* “Explain in simple terms”  
* “Respond in same language”

👉 Keep prompt structured (don’t overcomplicate yet)

---

### **3\. Call LLM**

* Use SDK (OpenAI / Groq)  
* Send:  
  * system prompt  
  * user message

---

### **4\. Extract response**

* Get clean text output  
* Avoid returning raw JSON from model

---

### **5\. Send response back**

Return:

{ "reply": "..." }

---

## **⚠️ Important Rule**

👉 Backend \= **logic layer**  
👉 Frontend \= **presentation layer**

Don’t mix them

---

# **🔐 5\. Environment Setup**

## **Step 1: Create `.env.local`**

Add:

API\_KEY=your\_key

---

## **Step 2: Access in backend only**

👉 NEVER expose API key to frontend

---

## **🧠 Mentor Note**

If API key leaks → project dead

---

# **🔄 6\. Connect Frontend to Backend**

Now go to your Phase-2 logic:

Inside `chat-container`

---

## **Replace Dummy AI Logic**

Instead of:

* setTimeout \+ fake response

👉 Do:

1. Send POST request to `/api/chat`  
2. Pass user message  
3. Wait for response  
4. Add AI message

---

## **Flow becomes:**

User message

   ↓

Add to UI

   ↓

Call /api/chat

   ↓

Receive response

   ↓

Add AI message

---

## **🧠 Important UX Rule**

👉 Show loading BEFORE API call  
👉 Remove loading AFTER response

---

# **⏱️ 7\. Error Handling (Don’t Skip)**

Handle:

* API failure  
* timeout  
* empty response

---

## **Expected behavior:**

If error:  
👉 Show fallback message:

“Something went wrong, please try again.”

---

## **🧠 Mentor Note**

Judges test edge cases

---

# **⚡ 8\. Performance Basics**

Keep it simple:

* One request per message  
* No streaming needed (for now)  
* Response time \< 2–3 sec

---

# **🧪 9\. Testing Checklist**

Test these:

---

### **✅ Normal Input**

“FD kya hota hai?”

---

### **✅ English Input**

“What is FD?”

---

### **✅ Mixed Input**

“FD safe hai kya for 1 year?”

👉 This is important (code-mixing concept)

---

### **✅ Empty Input**

(no crash)

---

### **✅ Rapid Messages**

(no break)

---

# **✅ PHASE 3 DONE (CHECKLIST)**

* API route working  
* AI responding correctly  
* Frontend connected  
* Loading works  
* Errors handled

👉 Now your app is:

**REAL AI PRODUCT (not demo anymore)**

---

# **🧠 What You Achieved**

At this point:

| Layer | Status |
| ----- | ----- |
| UI | ✅ Complete |
| Interaction | ✅ Complete |
| AI | ✅ Integrated |

👉 This already satisfies:

* “working product” requirement

---

# **⚠️ Common Mistakes (Avoid)**

---

## **❌ Putting API logic in frontend**

→ security issue

---

## **❌ Returning raw AI output**

→ messy UI

---

## **❌ Over-engineering prompts**

→ instability

---

## **❌ No loading state**

→ bad UX

---

