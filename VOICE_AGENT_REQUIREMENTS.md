# Voice Agent Platform — Functional Requirements Document (FRD)

**Document Version:** 1.1.0
**Author:** Product Management
**Status:** Approved for Implementation
**Target Architecture:** Domain-Agnostic Voice Agent Engine (MVP-First)

---

## 1. Executive Summary & Product Vision

### 1.1 Overview
The Voice Agent Platform is an audio-first, interactive conversational engine designed to guide users through structured, step-by-step dialogues. It synthesizes prompt text into spoken audio, captures user vocal responses, records history records in real time, and persists progress across multi-session journeys.

While the reference implementation powers an astrological counseling application ("Casa Siete / Astro"), the system architecture is strictly decoupled into a **Domain-Agnostic Voice Engine (MVP)** and **Injectable Domain Content Modules**.

### 1.2 Core MVP Philosophy
- **Lightweight & Fast:** Built on native browser APIs (Web Speech STT/TTS) to eliminate external API dependencies for the core voice loop.
- **Linear & Predictable:** Uses clear, deterministic sequential step flows (`nextStepId`) that make script authoring and implementation simple.
- **Domain Decoupled:** Can be adapted to any domain (e.g., Healthcare Intake, Sales Training, Onboarding, Tutoring) simply by changing script JSON files and user metadata.

---

## 2. Voice Agent State Machine

The core MVP voice engine operates as a straightforward finite state machine:

```
                  +-------------------+
                  |       IDLE        |
                  +---------+---------+
                            | (startAgent / resume)
                            v
                  +-------------------+
                  |     SPEAKING      |  (TTS plays prompt)
                  +---------+---------+
                            |
                            v
                  +-------------------+
                  |     LISTENING     |  (STT records voice input)
                  +---------+---------+
                            |
                            | (user speech captured)
                            v
                  +-------------------+
                  |   ADVANCE STEP    |  (Save transcript -> move to nextStepId)
                  +-------------------+
```

### State Inventory:
- `idle`: Engine initialized, waiting for user action to start/resume.
- `speaking`: Native browser TTS (or cloud voice) is playing prompt audio.
- `listening`: Web Speech API is actively capturing user microphone input.
- `sound_check`: Hardware check step playing test audio for volume verification.
- `mic_check`: Hardware check step confirming microphone responsiveness.
- `awaiting_selection`: Paused state awaiting user interaction on a UI widget (e.g., multiple-choice card).
- `editing`: (Optional/Advanced) User manually editing transcript text.
- `paused`: Conversation halted by user; audio and listening stopped.
- `error`: Exception state (e.g., mic permission denied, audio output error).

---

## 3. Categorized Functional Requirements

Requirements are organized into three distinct tiers:
1. **Basic (MVP Core Engine)** — Essential requirements for a minimal, fully functional voice agent.
2. **Advanced (Optional Enhancements)** — Powerful capabilities like LLM verification, ElevenLabs, and manual editing.
3. **Domain-Oriented (Domain Abstraction Framework)** — Rules for adapting the engine across different industries.

---

### 3.1 Basic Features (MVP Core Engine Capabilities)

These core features are required for a minimal viable implementation of the voice agent in any domain:

| Requirement ID | Feature Name | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **REQ-BASIC-001** | **Native Web STT Audio Capture** | The system MUST capture vocal input from the user's microphone using browser-native Web Speech API (`react-speech-recognition`) and display live transcript text on screen. Must handle browser mic permissions gracefully. | P0 (MVP) |
| **REQ-BASIC-002** | **Native Web TTS Audio Synthesis** | The system MUST synthesize step prompt text into spoken audio using browser-native Web Speech API (`window.speechSynthesis`). Speech MUST prime on initial user gesture (Click/Tap) to respect browser autoplay policies. | P0 (MVP) |
| **REQ-BASIC-003** | **Linear Sequential Script Execution** | The system MUST execute scripts defined as linear step sequences (`ScriptStep`). Each step contains `id`, `prompt`, `requirement`, and a `nextStepId` pointer. When a step completes, the engine automatically advances to `nextStepId`. | P0 (MVP) |
| **REQ-BASIC-004** | **Basic Response Capture & Validation** | For MVP, user responses are validated simply by ensuring non-empty speech capture (`transcript.trim().length > 0`). If no audio is detected, the agent speaks a simple retry prompt ("No pude escucharte, ¿podrías repetir?"). | P0 (MVP) |
| **REQ-BASIC-005** | **Hardware Onboarding Steps** | The engine MUST support hardware validation step types (`sound-check` to test speaker playback, and `mic-check` to confirm microphone responsiveness) prior to starting main conversation modules. | P0 (MVP) |
| **REQ-BASIC-006** | **Session History Persistence & Resumption** | All completed responses (`history: { stepId, transcript }[]`) MUST be persisted to backend storage (e.g., Netlify Functions + MongoDB or local storage). On re-opening a module, the engine reloads history and resumes at the next uncompleted step. | P0 (MVP) |
| **REQ-BASIC-007** | **Minimal Agent Control UI** | The frontend UI MUST include basic controls: Start / Pause / Resume, Replay Prompt, Skip Step, Progress Bar / Counter ("Paso X de Y"), Live Transcript Box, and Visual Status Badges (Idle, Speaking, Listening). | P0 (MVP) |

---

### 3.2 Advanced Features (Optional Enhancements & Deprecated Logic)

These optional features extend the core MVP with richer interactions, cloud AI services, and administrative controls:

| Requirement ID | Feature Name | Description & Acceptance Criteria | Status / Category |
| :--- | :--- | :--- | :--- |
| **REQ-ADV-001** | **LLM Response Verification (Gemini)** | *Optional Enhancement:* Evaluate free-form user transcripts against semantic step requirements using Google Gemini API (`gemini-3.1-flash-lite`). If response fails criteria, the agent speaks contextual hints and re-prompts the user. *(Currently disabled by default for MVP speed).* | Advanced |
| **REQ-ADV-002** | **ElevenLabs High-Quality Cloud TTS** | *Optional Enhancement:* Synthesize prompts using premium ElevenLabs voice models. Includes automatic fallback to native Web Speech API if cloud API fails or rate limits. | Advanced |
| **REQ-ADV-003** | **Human-in-the-Loop Review & Live Edit** | Users can pause listening to manually edit transcript text via keyboard. After completing a script, users enter a "Review Mode" to inspect and edit any past response. | Advanced |
| **REQ-ADV-004** | **In-Flight Reading Overlays** | Steps can display educational context in a "View Reading" modal overlay. Opening the modal pauses active voice playback/listening; closing it resumes interaction. | Advanced |
| **REQ-ADV-005** | **Multimodal Selection Cards** | Support `multiple-choice` steps. Auto-speech synthesis is suppressed and visual selection cards are rendered for explicit user choice. | Advanced |
| **REQ-ADV-006** | **Admin Dashboard & Profile Management** | Comprehensive admin panel for user creation, password resets, lesson access permissions (`allowedLessons`), and student answer audits. | Advanced |
| **REQ-ADV-007** | **Dynamic Conditional Branching** | *DEPRECATED:* Branching logic routing users down nested decision trees (`ScriptBranch[]`). Deprecated in favor of simpler linear step scripts (`nextStepId`) to reduce complexity and authoring overhead. | Deprecated |

---

### 3.3 Domain-Oriented Features (Domain Abstraction Framework)

To reuse the voice agent engine across different industries, all domain-specific logic is abstracted through injectable metadata and modular scripts:

| Requirement ID | Feature Name | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **REQ-DOM-001** | **Dynamic Variable Hydration** | The engine MUST accept a generic `UserProfile` containing metadata key-value pairs. Prompts and readings MUST support variable substitution (e.g., `{userName}`, `{department}`, `{userSign}`) at runtime. | P0 (MVP) |
| **REQ-DOM-002** | **Modular Script Progression** | Content MUST be organized into sequential modules/lessons. Access control rules MUST enforce module completion prerequisites before unlocking subsequent lessons. | P1 |
| **REQ-DOM-003** | **Domain Knowledge Base Mapping** | Reading content (`lecture` / `lectures`) MUST be dynamically selected from a domain knowledge file or API based on user profile attributes. | P1 |
| **REQ-DOM-004** | **Domain Analytics & Data Export** | User step responses MUST be exportable (JSON/CSV) for domain lead auditing, compliance verification, or student grading. | P2 |

---

## 4. Technical Specifications & Minimal Schemas

### 4.1 Script Schema (`Script`) — Simplified MVP

```typescript
export type ScriptStepType = 'default' | 'multiple-choice' | 'sound-check' | 'mic-check';

export interface ScriptStep {
  id: string;                // Step identifier (e.g., "[1] Intro")
  prompt: string;            // Text spoken by TTS agent
  requirement: string;       // Answer criteria (used by LLM if enabled, or doc reference)
  nextStepId: string | null; // ID of next sequential step (null if final step)
  type?: ScriptStepType;     // UI step type wrapper
}

export interface LectureContent {
  title: string;
  content: string;
}

export interface Script {
  initialStepId: string;
  steps: ScriptStep[];
  lecture?: LectureContent;
  lectures?: LectureContent[];
}
```

### 4.2 User Profile Schema (`UserProfile`)

```typescript
export interface UserProfile {
  username: string;
  isAdmin?: boolean;
  hasPassword?: boolean;
  allowedLessons?: string[];            // Permitted module IDs (e.g., ['Intro', 'Lesson_1'])

  // Generic Domain Attributes Container
  domainAttributes?: Record<string, string>;

  // Reference Domain Attributes (Astrology Reference Implementation)
  sunSign?: string;
  moonSign?: string;
  venusSign?: string;
}
```

### 4.3 Response Record Schema (`ResponseRecord`)

```typescript
export interface ResponseRecord {
  userId: string;
  scriptId: string;
  history: {
    stepId: string;
    transcript: string;
  }[];
  updatedAt: string;
}
```

---

## 5. Non-Functional Requirements (NFRs)

- **Latency (MVP):** Native Web TTS audio synthesis MUST begin playback within **< 300 ms** of step transition.
- **Microphone Timeout:** Automatic end-pointing MUST stop recording after **2.5 seconds** of silence.
- **Security:** API Keys MUST be kept in serverless environment variables. Passwords MUST be hashed (`scrypt`).
- **Resilience:** Local browser storage (`localStorage`) MUST cache history immediately on response capture to prevent data loss on network disconnect.

---

## 6. Multi-Domain Adaptation Blueprint (MVP Case Studies)

To implement this MVP engine in another domain, simply create a domain script JSON and define user metadata attributes.

### Case Study 1: Healthcare Patient Intake (MVP)

```json
{
  "initialStepId": "[1] Symptom",
  "steps": [
    {
      "id": "[1] Symptom",
      "prompt": "Hello {userName}. What is the primary symptom you are experiencing today?",
      "requirement": "User mentions primary physical symptom.",
      "nextStepId": "[2] Duration"
    },
    {
      "id": "[2] Duration",
      "prompt": "How many days have you had this symptom?",
      "requirement": "User specifies duration in days or weeks.",
      "nextStepId": "[3] Medications"
    },
    {
      "id": "[3] Medications",
      "prompt": "Are you currently taking any prescription medications?",
      "requirement": "User lists medications or states none.",
      "nextStepId": null
    }
  ]
}
```

### Case Study 2: Sales Objection Training (MVP)

```json
{
  "initialStepId": "[1] Pricing_Objection",
  "steps": [
    {
      "id": "[1] Pricing_Objection",
      "prompt": "Simulated Client: 'Your service is too expensive.' How do you respond?",
      "requirement": "Trainee highlights value proposition and ROI.",
      "nextStepId": "[2] Timing_Objection"
    },
    {
      "id": "[2] Timing_Objection",
      "prompt": "Simulated Client: 'We don't have time to implement this quarter.' How do you address this?",
      "requirement": "Trainee suggests phased onboarding plan.",
      "nextStepId": null
    }
  ]
}
```

### Case Study 3: Corporate Security Onboarding (MVP)

```json
{
  "initialStepId": "[1] Phishing",
  "steps": [
    {
      "id": "[1] Phishing",
      "prompt": "Welcome {userName}. If you receive a suspicious email requesting gift cards, what action do you take?",
      "requirement": "Employee states reporting email to IT Security.",
      "nextStepId": "[2] Passwords"
    },
    {
      "id": "[2] Passwords",
      "prompt": "What is our company policy regarding sharing work passwords with teammates?",
      "requirement": "Employee states passwords must never be shared.",
      "nextStepId": null
    }
  ]
}
```

---
