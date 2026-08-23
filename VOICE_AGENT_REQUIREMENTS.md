# Voice Agent Platform — Functional Requirements Document (FRD)

**Document Version:** 1.0.0
**Author:** Product Management
**Status:** Approved for Implementation
**Target Architecture:** Domain-Agnostic Voice Agent Engine

---

## 1. Executive Summary & Product Vision

### 1.1 Overview
The Voice Agent Platform is an interactive, conversational audio-first agent engine capable of guiding users through structured, multi-step workflows, evaluating user spoken or written responses in real time using Large Language Models (LLMs), executing dynamic branch logic, and persisting progress across multi-session journeys.

While the initial reference implementation delivers an astrological counseling experience ("Casa Siete / Astro"), the underlying architecture is strictly decoupled into a **Domain-Agnostic Core Voice Engine** and **Injectable Domain Context Modules**.

### 1.2 Objectives
- **Domain Decoupling:** Enable seamless deployment across verticals (e.g., Healthcare Intake, Sales Training, Corporate Onboarding, Educational Tutoring) without code modifications to the core agent engine.
- **Multimodal Interaction:** Support natural voice dialogue (STT/TTS), visual reading context, interactive widgets (multiple-choice options), hardware validation steps, and manual text editing fallbacks.
- **Reliable Evaluation & Branching:** Intelligently evaluate whether a user's free-form answer satisfies step criteria and dynamically route the user down appropriate conversational branches.
- **State Persistence & Resumption:** Maintain deterministic user progress, allowing users to pause, review, edit past answers, and resume seamlessly from any device.

---

## 2. System Architecture & Core State Machine

### 2.1 Voice Agent State Machine
The core voice engine operates as a finite state machine with the following states:

```
                      +-------------------+
                      |       IDLE        |
                      +---------+---------+
                                | (startAgent)
                                v
                      +-------------------+
                      |     SPEAKING      |<-------------+
                      +---------+---------+              |
                                |                        | (feedback/repeat)
                                v                        |
                      +-------------------+              |
                      |     LISTENING     |              |
                      +----+---------+----+              |
                           |         |                   |
            (user edits)   |         | (recording stops) |
     +---------------------+         +-------------+     |
     |                                             |     |
     v                                             v     |
+----+----+                                   +----+-----+----+
| EDITING |                                   |   VERIFYING   |
+----+----+                                   +----+-----+----+
     |                                             |     |
     | (submit)                                    |     | (failed evaluation)
     +--------------------->+                      |     +------+
                            |                      |            |
                            v                      v            v
                      +-----+----------------------+--+   +-----+-----+
                      |       PROCESSING / EVAL       |   | SPEAKING  |
                      +---------------+---------------+   +-----------+
                                      |
                                      | (evaluation success)
                                      v
                      +---------------+---------------+
                      |           VERIFIED            |
                      +---------------+---------------+
                                      |
                                      v
                      +---------------+---------------+
                      |        ADVANCE STEP           |
                      +-------------------------------+
```

#### Complete State Inventory:
1. `idle`: Engine is initialized but inactive, waiting for user trigger.
2. `speaking`: Text-to-Speech (TTS) engine is synthesizing and playing prompt audio.
3. `listening`: Speech-to-Text (STT) engine is actively listening for user vocal input.
4. `sound_check`: Hardware test step playing test audio for user volume verification.
5. `mic_check`: Hardware test step verifying microphone capture capability.
6. `awaiting_selection`: Paused state requiring user interaction with a UI widget (e.g., multiple choice, branching selector).
7. `editing`: User is manually modifying transcript text via UI keyboard input.
8. `verifying`: System is processing transcript through LLM evaluation.
9. `verified`: Brief confirmation state indicating successful response validation.
10. `paused`: Agent execution halted by user; audio playback and STT stopped.
11. `error`: Exception state (network failure, TTS API error, mic permission denied).

---

## 3. Functional Requirements

Features are split into three tiers:
- **Basic (Core Engine Capabilities)**
- **Advanced (Interactive & Control Capabilities)**
- **Domain-Oriented (Domain Abstraction Framework)**

---

### 3.1 Basic Features (Core Engine Capabilities)

| Requirement ID | Feature Name | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **REQ-BASIC-001** | **STT Audio Capture** | The system MUST capture real-time audio from the user's microphone using Web Speech API (or Speech-to-Text provider) and stream live transcription to the UI. Must handle microphone permissions gracefully and provide automatic end-pointing detection. | P0 |
| **REQ-BASIC-002** | **TTS Audio Synthesis** | The system MUST synthesize step prompt text into natural audio speech. It MUST support Web Speech API (native browser synthesis) and premium cloud TTS providers (e.g., ElevenLabs). Audio output MUST automatically prime on user gesture to comply with browser autoplay policies. | P0 |
| **REQ-BASIC-003** | **Sequential Script Execution** | The system MUST execute structured scripts composed of sequential steps (`ScriptStep`). Each step MUST define `id`, `prompt`, `requirement`, and `nextStepId`. | P0 |
| **REQ-BASIC-004** | **Hardware Onboarding (Sound & Mic Check)** | The engine MUST support specialized step types (`sound-check`, `mic-check`) during onboarding. The user must be able to test speaker playback and confirm microphone responsiveness before entering main conversation loops. | P1 |
| **REQ-BASIC-005** | **LLM Response Verification Engine** | The engine MUST submit the user's speech transcript along with the step's expected `requirement` to an LLM evaluator (e.g., Gemini 3.1 Flash Lite). The LLM determines if the response is valid (`success: true/false`). On invalid responses, the agent speaks contextual feedback and re-prompts the user. | P0 |
| **REQ-BASIC-006** | **Session State Persistence** | All step responses (`history: { stepId, transcript }[]`) MUST be persisted to backend storage (e.g., REST/Netlify Functions + MongoDB) in real-time. On session re-entry, the engine MUST reload past responses and auto-advance to the uncompleted step. | P0 |
| **REQ-BASIC-007** | **Basic Agent Control UI** | The frontend UI MUST provide controls for: Start/Pause/Resume, Replay Prompt, Skip Step, Step Progress Indicator (e.g., "Paso 3 de 8"), Live Transcript Display, and Visual Status Badges (e.g., Speaking, Listening, Verifying). | P0 |

---

### 3.2 Advanced Features (Interactive & Control Capabilities)

| Requirement ID | Feature Name | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **REQ-ADV-001** | **Dynamic Multi-Turn Branching** | Steps MAY define conditional branches (`ScriptBranch[]`). The LLM evaluator evaluates free-form input and selects the matching branch index (`selectedBranchIndex`). The engine dynamically routes execution to the first step of the selected branch before returning to the main script flow. | P0 |
| **REQ-ADV-002** | **Human-in-the-Loop Review & Live Transcript Editing** | Users MUST be able to pause voice recording, switch to `editing` state, manually edit speech transcript text via visual text input, and submit the corrected text for verification. After completing a script, users can access a full "Review Mode" to inspect and edit any past answer. | P1 |
| **REQ-ADV-003** | **In-Flight Educational Reading Overlays** | Steps MAY be associated with background educational lectures (`lecture` or `lectures`). The UI MUST provide a "View Reading" modal. Opening the modal pauses active TTS/STT; closing it resumes interaction. | P1 |
| **REQ-ADV-004** | **Multimodal Input Support** | The engine MUST support structured non-voice input types, such as `multiple-choice` cards. When encountered, TTS auto-playback is suppressed, and the UI displays interactive option cards for explicit user selection. | P1 |
| **REQ-ADV-005** | **Provider Fallback & Settings Customization** | Users/Admins MUST be able to customize agent settings (ElevenLabs API Key, Voice ID, Toggle Gemini Verification, Max Listening Duration). If cloud TTS fails (e.g., rate limit or network failure), the engine MUST automatically fall back to Web Speech API without crashing. | P1 |
| **REQ-ADV-006** | **Administrative Dashboard & Profile Governance** | Admins MUST have an Admin Dashboard providing: User Creation/Editing, Password Reset, Module Access Management (`allowedLessons`), Session Data Audit, and CSV/JSON Response History Export. | P1 |
| **REQ-ADV-007** | **Secure Authentication & Access Control** | The system MUST support user authentication with salt-hashed passwords (`scrypt`). Admin capabilities MUST be restricted to authorized admin profiles (`isAdmin: true`). Non-admin users can only navigate modules permitted in their `allowedLessons` list. | P1 |

---

### 3.3 Domain-Oriented Features (Domain Abstraction Framework)

To reuse this voice agent engine in diverse domains beyond astrology, the architecture abstracts all domain specificities through dynamic context hydration and modular schemas:

| Requirement ID | Feature Name | Description & Acceptance Criteria | Priority |
| :--- | :--- | :--- | :--- |
| **REQ-DOM-001** | **Dynamic Context Hydration & Metadata Injection** | The core engine MUST accept a generic `UserProfile` containing key-value metadata. Script templates and lectures MUST support dynamic placeholder substitution (e.g., `{userName}`, `{primaryAttribute}`, `{assignedCohort}`). The engine hydrator injects user metadata into prompts and lecture readings at runtime. | P0 |
| **REQ-DOM-002** | **Modular Script Taxonomy & Progression Rules** | Scripts MUST be organized into sequential Modules/Lessons. Access control rules MUST support prerequisite locking (e.g., Module 2 is locked until Module 1 is completed), transferable across any learning curriculum. | P1 |
| **REQ-DOM-003** | **Domain-Specific Verification Rule Customization** | Step requirements MUST support domain-specific evaluation rules (e.g., checking for specific clinical symptoms in Healthcare, sales objection handling compliance in Sales, or grammar correctness in Language Learning). Prompt structures submitted to the LLM must accept domain context wrappers. | P0 |
| **REQ-DOM-004** | **Domain Knowledge Base Binding** | Reading content (`lecture` / `lectures`) MUST be dynamically selected from a domain knowledge service based on user metadata attributes (e.g., medical diagnosis, sales persona, student skill level). | P1 |
| **REQ-DOM-005** | **Domain Analytical Export & Audit** | The backend MUST store structured records mapping step IDs to domain key performance indicators (KPIs), enabling domain leads to evaluate completion rates, common failure steps, and user performance analytics. | P2 |

---

## 4. Technical Specifications & Data Schemas

### 4.1 Script Definition Schema (`Script`)

```typescript
export type ScriptStepType = 'default' | 'multiple-choice' | 'sound-check' | 'mic-check';

export interface ScriptBranch {
  label: string;             // Display name or selection label for branch
  requirement: string;       // Evaluation criteria for matching this branch
  steps: ScriptStep[];       // Child steps contained within this branch
}

export interface ScriptStep {
  id: string;                // Unique step identifier (e.g., "[1] Intro")
  prompt: string;            // Spoken prompt text synthesized by TTS
  requirement: string;       // Validation rule evaluated by LLM
  nextStepId: string | null; // Next sequential step ID (null if final step or branching)
  type?: ScriptStepType;     // Optional specialized step UI/behavior type
  branches?: ScriptBranch[]; // Optional array of conditional branch paths
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
  activeSessionId?: string | null;
  allowedLessons?: string[];          // List of allowed module IDs (e.g. ['Intro', 'Module_1'])

  // Generic Domain Attributes Container (Extensible)
  domainAttributes?: Record<string, string>;

  // Reference Domain Metadata (Astrology Reference Implementation)
  sunSign?: string;
  moonSign?: string;
  venusSign?: string;
  casaCuatroSign?: string;
  descendenteSign?: string;
  nodoLunarSign?: string;
  casaSolar?: string;
  casaKarma?: string;
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
    timestamp?: string;
  }[];
  updatedAt: string;
}
```

### 4.4 LLM Verification Payload (`EvaluationPayload`)

```typescript
export interface EvaluationRequest {
  transcript: string;
  step: ScriptStep;
}

export interface EvaluationResponse {
  success: boolean;
  feedback?: string;             // Contextual hint spoken back to user on evaluation failure
  selectedBranchIndex?: number;  // Index of matched ScriptBranch (if step has branches)
}
```

---

## 5. Non-Functional Requirements (NFRs)

### 5.1 Performance & Latency SLAs
- **TTS Initial Byte Latency (TTFB):** Audio playback MUST start within **< 1.2 seconds** for ElevenLabs cloud API and **< 300 ms** for Web Speech API.
- **LLM Verification Latency:** Evaluation response from `/evaluate` endpoint MUST complete within **< 2.0 seconds** (P95).
- **Audio End-Pointing:** Silence detection timeout for STT MUST trigger within **1.5–3.0 seconds** after the user stops speaking.

### 5.2 Browser & Device Compatibility
- **Desktop Browsers:** Chrome 90+, Edge 90+, Safari 14.1+, Firefox 90+ (Web Speech API or Polyfill).
- **Mobile Browsers:** iOS Safari 14.5+, Android Chrome 90+.
- **Hardware Access:** HTTPS MUST be enforced across all environments to permit browser microphone access.

### 5.3 Reliability & Resilience
- **TTS Failure Fallback:** If cloud TTS endpoint fails, engine MUST seamlessly switch to browser native speech synthesis.
- **STT Failure Grace Period:** If microphone fails to capture input twice consecutively, the system MUST display text-input fallback modal.
- **Offline Persistence Cache:** User transcript edits MUST update local state (`localStorage`) immediately before async network sync to prevent data loss.

### 5.4 Security & Data Privacy
- **Credential Storage:** User passwords MUST be stored as cryptographic hashes (`scrypt` with random 16-byte salt).
- **API Key Masking:** Cloud API Keys (`GEMINI_API_KEY`, `ELEVENLABS_API_KEY`) MUST remain on serverless backend functions (`netlify/functions`) and NEVER be exposed to browser bundles.
- **Data Privacy (GDPR/PII):** User voice transcript records MUST be strictly isolated by `userId` and accessible only by authorized admins or the user themselves.

---

## 6. Domain Adaptation Blueprint & Case Studies

This section outlines how to adapt the domain-agnostic engine for three alternative industries.

---

### Case Study A: Healthcare & Patient Intake Screening

#### Domain Objective
Guide patients through an interactive medical intake dialogue prior to a clinical consultation, recording symptoms and evaluating urgency.

#### Domain Data Configuration
- **User Attributes (`UserProfile`):** `patientId`, `age`, `assignedDepartment`, `primaryCondition`.
- **Knowledge Base Injection:** Clinical guidelines popups, symptom checklists.

#### Sample Script Schema (`patient_intake.json`)
```json
{
  "initialStepId": "[1] Symptom_Overview",
  "steps": [
    {
      "id": "[1] Symptom_Overview",
      "prompt": "Hello {userName}. I'm your virtual triage assistant. Please describe the primary symptom you are experiencing today.",
      "requirement": "User must describe a physical or mental health symptom.",
      "nextStepId": "[2] Duration_Check"
    },
    {
      "id": "[2] Duration_Check",
      "prompt": "Thank you. How many days have you been experiencing this symptom, and is it constant or intermittent?",
      "requirement": "User must specify a duration (e.g. days/weeks) and pattern (constant or intermittent).",
      "nextStepId": "[3] Severity_Branch"
    },
    {
      "id": "[3] Severity_Branch",
      "prompt": "On a scale of 1 to 10, how severe is your pain or discomfort right now?",
      "requirement": "User must state a severity score from 1 to 10.",
      "nextStepId": null,
      "branches": [
        {
          "label": "Mild to Moderate (1-6)",
          "requirement": "Rating between 1 and 6.",
          "steps": [
            {
              "id": "[3a] Standard_Intake",
              "prompt": "Understood. Please list any current medications you are taking.",
              "requirement": "User names medications or states they take none.",
              "nextStepId": "FINISHED"
            }
          ]
        },
        {
          "label": "Severe (7-10)",
          "requirement": "Rating between 7 and 10.",
          "steps": [
            {
              "id": "[3b] Urgent_Escalation",
              "prompt": "Your severity rating is high. Are you experiencing shortness of breath or chest pain?",
              "requirement": "User answers yes or no to emergency symptoms.",
              "nextStepId": "FINISHED"
            }
          ]
        }
      ]
    }
  ]
}
```

---

### Case Study B: B2B Enterprise Sales Roleplay Training

#### Domain Objective
Train sales representatives on objection handling (e.g., pricing objections, competitor comparisons) with automated scoring and branching.

#### Domain Data Configuration
- **User Attributes (`UserProfile`):** `repId`, `tier`, `productLine`, `targetPersona`.
- **Knowledge Base Injection:** Battle cards, competitive matrix readings.

#### Sample Script Schema (`sales_objection_pricing.json`)
```json
{
  "initialStepId": "[1] Objection_Pitch",
  "steps": [
    {
      "id": "[1] Objection_Pitch",
      "prompt": "Simulated Prospect: 'Your software looks interesting, but your pricing is 30% higher than your competitor.' How do you respond?",
      "requirement": "Rep must acknowledge value, differentiate feature capabilities, and avoid immediate discounting.",
      "nextStepId": "[2] Value_Followup"
    },
    {
      "id": "[2] Value_Followup",
      "prompt": "Simulated Prospect: 'That makes sense, but we don't have budget approval this quarter.' What is your next move?",
      "requirement": "Rep must propose flexible implementation timeline, ROI demonstration, or phased rollout.",
      "nextStepId": "FINISHED"
    }
  ]
}
```

---

### Case Study C: Employee Onboarding & Compliance Training

#### Domain Objective
Conduct interactive compliance orientation for new hires, verifying understanding of workplace security and safety policies.

#### Domain Data Configuration
- **User Attributes (`UserProfile`):** `employeeId`, `department`, `location`, `securityClearance`.
- **Knowledge Base Injection:** Employee Handbook, Cybersecurity Policy PDF overlays.

#### Sample Script Schema (`cybersecurity_onboarding.json`)
```json
{
  "initialStepId": "[1] Phishing_Scenario",
  "steps": [
    {
      "id": "[1] Phishing_Scenario",
      "prompt": "Welcome {userName} to {companyName} IT Security Orientation. Imagine you receive an urgent email from your 'CEO' asking for immediate gift card purchases. What steps do you take?",
      "requirement": "Employee must mention checking sender address, not clicking links, and reporting to IT security desk.",
      "nextStepId": "[2] Password_Policy"
    },
    {
      "id": "[2] Password_Policy",
      "prompt": "Correct! Next, what is our corporate policy regarding password sharing with internal colleagues?",
      "requirement": "Employee must state that passwords should never be shared under any circumstances.",
      "nextStepId": "FINISHED"
    }
  ]
}
```

---

## 7. Implementation & Release Roadmap

| Phase | Milestone | Scope & Deliverables | Target Timeline |
| :--- | :--- | :--- | :--- |
| **Phase 1** | **Core Engine Extraction** | Abstract hardcoded domain elements into dynamic schema configuration. Implement generic `UserProfile` attributes hydration. | Sprint 1–2 |
| **Phase 2** | **Multi-Domain Registry** | Implement dynamic script loader allowing script selection based on application domain context (Healthcare, Sales, Onboarding). | Sprint 3–4 |
| **Phase 3** | **Advanced Analytics & Reporting** | Add domain analytical dashboards to Admin Interface (Step pass/fail analytics, completion funnel). | Sprint 5 |
| **Phase 4** | **No-Code Script Builder** | Create visual drag-and-drop editor for instructional designers to author scripts, prompts, evaluation criteria, and branching without writing JSON. | Sprint 6–8 |

---
