# ELEOT Application Interface Enhancement Requirements

## 1. Evaluation Table Interface Correction

**Requirement:** Remove the "Improvement" column header and associated data column from the evaluation results table displayed in the application interface.

**Rationale:** The current table includes an "Improvement" column that is not required in the evaluation output. This column must be completely removed from both the table header and table body rendering logic.

---

## 2. Evaluation Button Label Update

**Requirement:** Modify the evaluation action button label from "قيّم" (Arabic) / "Evaluate" (English) to "AI-Based Evaluation" in both language versions.

**Implementation Details:**
- Update the button text in the HTML template
- Update corresponding translation keys in the localization system
- Ensure the label displays correctly in both Arabic and English language modes

---

## 3. Administrative Data Field Reordering

**Requirement:** Reorganize the administrative data input fields to display in the following sequential order:

1. Teacher Name
2. Subject
3. Grade
4. Section/Part
5. Date

**Implementation Details:**
- Modify the HTML structure to reflect the new field order
- Update the CSS grid layout if necessary to maintain visual consistency
- Ensure data collection and storage functions maintain the new field sequence

---

## 4. Supervisor Name Field Addition

**Requirement:** Add a new administrative data input field titled "Supervisor Name" to the administrative data section.

**Implementation Details:**
- Create a new input field with appropriate label (supporting both Arabic and English)
- Integrate the field into the administrative data collection and storage functions
- Ensure the field is included in all data export functions (PDF, CSV, Word)

---

## 5. Score Editability Enhancement

**Requirement:** Enable manual editing of AI-generated evaluation scores after the analysis is complete.

**Implementation Details:**
- Convert score display cells from read-only text to editable input fields
- Implement validation to ensure scores remain within the valid range (1-4)
- Update the underlying data model when scores are manually modified
- Recalculate the overall score when individual scores are edited

---

## 6. Justification Text Editability Enhancement

**Requirement:** Enable manual editing of AI-generated justification text after the analysis is complete.

**Implementation Details:**
- Convert justification display cells from read-only text to editable text areas or content-editable elements
- Maintain proper formatting and styling for edited justifications
- Update the underlying data model when justifications are manually modified
- Ensure edited justifications are preserved in export functions

---

## 7. Recommendations Section Restructuring

**Requirement:** Modify the recommendations section output format according to the following specifications:

### 7.1 Opening Statement
- Begin the recommendations section with the phrase: "With sincere appreciation to [Teacher Name]," where [Teacher Name] is dynamically populated from the administrative data field entered above.

### 7.2 Positive Elements Listing
- Display a list of the strongest positive elements observed in the lesson, based on criteria that received scores of 3 or 4.

### 7.3 Improvement Suggestions Logic
- **Condition 1:** If any criteria received a score of 1 or 2, provide improvement suggestions specifically for those criteria.
- **Condition 2:** If no criteria scored 1 or 2, but some criteria scored 3, provide improvement suggestions for criteria that scored 3.
- **Condition 3:** If all criteria scored 4, display only the appreciation statement and the list of strong elements (no improvement suggestions).

**Implementation Details:**
- Modify the recommendations generation logic in the AI prompt or post-processing function
- Update the recommendations display function to format content according to the new structure
- Ensure the teacher name is dynamically inserted from the administrative data
- Implement conditional logic to determine which improvement suggestions to display based on score distribution

---

## Output Requirements

- All modifications must maintain backward compatibility with existing data structures where possible
- All user interface changes must support both Arabic and English language modes
- All manual edits to scores and justifications must be preserved during export operations
- The application must maintain data integrity and validation throughout all editing operations






