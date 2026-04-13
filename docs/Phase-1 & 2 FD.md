# **PHASE 1 — UI FOUNDATION (STRUCTURE ONLY)**

---

## **🎯 Goal**

Create a **clean, stable chat screen layout** (no logic yet)

---

## **📁 Step 1: Define Page Responsibility**

### **File:**

`app/page.tsx`

👉 This will act as:

**Chat Screen Container (root UI)**

### **What you should do:**

* Remove any default boilerplate UI  
* Treat this page as a **full-screen chat app**  
* Divide layout into 3 sections:

\[Header (optional)\]  
\[Chat Messages Area\]  
\[Input Area\]

---

## **📁 Step 2: Create Core Components**

Inside `components/`, create:

### **1\. `chat-container.tsx`**

👉 Responsible for:

* full layout wrapper  
* managing spacing \+ structure

---

### **2\. `chat-messages.tsx`**

👉 Responsible for:

* displaying list of messages  
* scrollable area

---

### **3\. `chat-input.tsx`**

👉 Responsible for:

* input field  
* send button

---

### **4\. `chat-bubble.tsx`**

👉 Responsible for:

* rendering **single message**  
* handles:  
  * user message  
  * AI message

---

## **📁 Step 3: Component Hierarchy (IMPORTANT)**

Your structure should look like:

page.tsx  
 └── ChatContainer  
      ├── ChatMessages  
      │     └── ChatBubble (multiple)  
      └── ChatInput

👉 Keep this strict — don’t mix responsibilities

---

## **📁 Step 4: Layout Behavior Rules**

### **Chat Container**

* Full height (viewport)  
* Flex column layout

---

### **Messages Area**

* Scrollable  
* Takes remaining height  
* Padding for readability

---

### **Input Area**

* Fixed at bottom  
* Always visible  
* Doesn’t move when messages grow

---

## **📁 Step 5: Chat Bubble Design Logic**

In `chat-bubble.tsx`, define:

* Prop: `role` → `"user"` or `"assistant"`  
* Based on role:  
  * alignment changes  
  * styling changes

👉 Don’t hardcode content  
Make it reusable

---

## **📁 Step 6: Dummy Data Rendering**

Inside `chat-messages.tsx`:

* Create a **temporary static array**

Example structure (conceptual):

\[  
  { role: "user", content: "FD kya hota hai?" },  
  { role: "assistant", content: "FD ek investment option hai..." }  
\]

* Map over this  
* Render ChatBubble

---

## **✅ PHASE 1 DONE (CHECKLIST)**

* Page shows chat layout  
* Messages appear (static)  
* Input box visible  
* Layout doesn’t break

👉 Even without logic, it should look like a **real product skeleton**

---

## **🧠 Mentor Insight**

If Phase 1 is clean:

Phase 2 becomes easy

If Phase 1 messy:

everything becomes messy

---

# **🟢 PHASE 2 — CHAT INTERACTION (FRONTEND LOGIC)**

---

## **🎯 Goal**

Make chat **interactive and state-driven**

---

## **📁 Step 1: State Management (IMPORTANT)**

Inside `chat-container.tsx`:

Create state:

* messages array  
* input value  
* loading state (boolean)

👉 This becomes your **single source of truth**

---

## **📁 Step 2: Message Flow Logic**

You need 3 core actions:

---

### **1\. Add User Message**

When user clicks send:

* take input value  
* push new message into messages array  
* clear input

---

### **2\. Trigger AI Response (Mock for now)**

* After user message:  
  * set loading \= true  
  * wait (simulate delay)  
  * add dummy AI message  
  * set loading \= false

---

### **3\. Prevent Empty Messages**

* If input is empty → do nothing

---

## **📁 Step 3: Connect Components**

---

### **ChatInput → ChatContainer**

Pass:

* input value  
* setter  
* send handler

---

### **ChatMessages → ChatContainer**

Pass:

* messages array  
* loading state

---

## **📁 Step 4: Loading Indicator**

Inside `chat-messages.tsx`:

* If loading \= true:  
  * show “AI is typing…” bubble

👉 Treat it like a message, not separate UI

---

## **📁 Step 5: Auto Scroll (VERY IMPORTANT)**

After every new message:

* scroll to bottom

👉 Without this → UX feels broken

---

## **📁 Step 6: Input Behavior**

In `chat-input.tsx`:

* Enter key → send message  
* Button click → send message

👉 Both should work

---

## **📁 Step 7: Disable Input While Loading**

Optional but good:

* when loading:  
  * disable send button  
  * or prevent multiple clicks

---

## **📁 Step 8: Smooth UX Details**

* input clears instantly  
* message appears instantly  
* AI delay feels natural (\~1–2 sec)

---

## **✅ PHASE 2 DONE (CHECKLIST)**

* User types → message appears instantly  
* AI response appears after delay  
* “Typing…” indicator works  
* Auto-scroll works  
* No UI glitches

👉 Now it feels like a **real chat app**

---

## **🧠 Mentor Insight**

At this point:

You don’t have AI  
But it FEELS like AI exists

That’s exactly what you want.

---

# **⚠️ Common Mistakes (Avoid)**

---

## **❌ Mixing logic in multiple components**

👉 Keep logic only in `chat-container`

---

## **❌ Directly mutating state**

👉 Always create new array

---

## **❌ No loading state**

👉 Chat feels robotic without it

---

## **❌ No scroll handling**

👉 Biggest UX killer

---

# **🚀 What You’ll Achieve After Phase 2**

You’ll have:

* Working chat UI  
* Proper component architecture  
* Clean state management  
* Real product feel

👉 This is already **strong MVP foundation**

