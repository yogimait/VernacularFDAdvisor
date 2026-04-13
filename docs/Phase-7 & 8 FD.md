# **PHASE 7 — STEP-BY-STEP GUIDANCE (ASSISTANT BEHAVIOR)**

---

## **🎯 Goal**

User ko sirf answer nahi dena —  
**guide karna hai next action tak**

👉 System should always answer:

“Ab user ko kya karna chahiye?”

---

# **🧠 1\. Core Concept**

Right now:

* user asks → AI answers

After Phase 7:

* user asks → AI answers \+ guides

---

## **🔄 Transformation**

Query → Explanation → Recommendation → Next Step

---

# **📁 2\. Where to Implement**

Main logic:

app/api/chat/route.ts

👉 This is **behavior layer upgrade**

---

# **🧩 3\. Core Change — “Next Step Engine”**

---

## **🔹 Rule: Every response MUST include**

➡ Next Step:

(action user should take)

---

## **🧠 Types of Next Steps**

---

### **Type 1: Informational Query**

User:

“FD kya hota hai?”

👉 Next Step:

* ask if user wants recommendation

---

### **Type 2: Partial Input**

User:

“Mere paas 50k hai”

👉 Next Step:

* ask duration

---

### **Type 3: Recommendation Given**

User:

“50k for 1 year”

👉 Next Step:

* choose bank  
* start FD

---

### **Type 4: Confused User**

User:

“Best FD?”

👉 Next Step:

* ask clarifying questions

---

# **🧩 4\. Implementation Strategy**

---

## **Step 1: Update Prompt Rules**

Add logic:

* Always include next step  
* Make it actionable  
* Keep it short

---

## **Step 2: Context Awareness (IMPORTANT)**

To generate correct next step:

👉 You need context:

* current query  
* extracted data (amount, duration)

---

## **Step 3: Condition-based Guidance**

You can structure internally:

---

### **Case A: No financial info**

👉 Ask:

* “Kitna invest karna chahte ho?”

---

### **Case B: Only amount**

👉 Ask:

* “Kitne time ke liye invest karna hai?”

---

### **Case C: Full info**

👉 Suggest:

* FD options  
* next action

---

## **🧠 Key Insight**

👉 Don’t rely fully on AI  
👉 Use **basic logic \+ AI together**

---

# **🧪 5\. Testing Cases**

---

### **Case 1**

“FD kya hota hai?”

👉 Ends with:

* “Kya aap FD options dekhna chahte ho?”

---

### **Case 2**

“Mere paas 50k hai”

👉 Ends with:

* “Kitne duration ke liye invest karna chahte ho?”

---

### **Case 3**

“50k for 1 year”

👉 Ends with:

* “Aap inme se koi bank select karke FD start kar sakte ho”

---

# **✅ PHASE 7 DONE (CHECKLIST)**

* Every response has next step  
* Context-based guidance  
* No dead-end responses

👉 Now system feels like **assistant, not chatbot**

---

# **🟢 PHASE 8 — STRUCTURED UI RESPONSES (PREMIUM EXPERIENCE)**

---

## **🎯 Goal**

Make responses:

* readable  
* scannable  
* visually structured

👉 Judges should instantly understand output

---

# **🧠 1\. Problem Right Now**

Even if content is good:

* plain text \= boring  
* hard to scan

---

# **🧩 2\. Strategy**

You have 2 approaches:

---

## **❌ Approach A: Raw text formatting**

* emojis \+ text

👉 works but limited

---

## **✅ Approach B: Semi-structured rendering (BEST)**

👉 Backend sends structured hints  
👉 Frontend renders clean UI

---

# **📁 3\. Upgrade Response Format**

Instead of only:

{ "reply": "text" }

---

## **Move toward:**

{

  "type": "explanation | recommendation",

  "content": {

    "explanation": "...",

    "example": "...",

    "points": \["...", "..."\],

    "nextStep": "..."

  }

}

---

## **🧠 Important**

👉 You can still keep fallback:

* if parsing fails → show raw text

---

# **🧩 4\. Backend Changes**

Inside `route.ts`:

---

## **Step 1: Ask AI for JSON output**

Force:

* structured fields  
* predictable format

---

## **Step 2: Validate response**

* ensure fields exist  
* fallback if broken

---

# **🧩 5\. Frontend Rendering Logic**

---

## **Step 1: Update `chat-bubble.tsx`**

👉 Instead of rendering plain text:

Check:

if (structured)

   render sections

else

   render text

---

## **Step 2: Render Sections**

---

### **🔹 Explanation Block**

* main content

---

### **🔹 Example Block**

* smaller text

---

### **🔹 Key Points**

* bullet list

---

### **🔹 Next Step**

* highlighted section

---

## **🧠 Important**

👉 Don’t overdesign  
👉 Just make it clean \+ readable

---

# **🧩 6\. Special Case — Recommendation Cards**

For Phase 6 responses:

---

## **Instead of text:**

👉 Render cards:

* bank name  
* interest rate  
* duration  
* reason

---

## **Where:**

Inside:

chat-bubble.tsx

---

# **🧪 7\. Testing Cases**

---

### **Case 1: Explanation**

👉 Proper sections visible

---

### **Case 2: Recommendation**

👉 Cards render

---

### **Case 3: Fallback**

👉 Raw text still works

---

# **✅ PHASE 8 DONE (CHECKLIST)**

* Responses structured visually  
* Sections clearly separated  
* Recommendation shown as cards  
* Fallback works

👉 Now UI looks **premium \+ product-grade**

---

# **🧠 Final Transformation**

| Phase | Result |
| ----- | ----- |
| Phase 6 | Smart advisor |
| Phase 7 | Guided assistant |
| Phase 8 | Premium product |

---

# **🔥 Real Insight**

Most people:

* stop at “AI working”

You:

* built **UX \+ intelligence \+ guidance**

👉 That’s what wins hackathons