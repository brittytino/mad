# Rapid Redesign Guide (Any New Screen)

## Step 1: Break question into blocks
- Header block
- Input block
- Action block
- Output block

## Step 2: Choose layout quickly
- Vertical forms: LinearLayout + ScrollView
- Side by side controls: nested LinearLayout horizontal
- Overlap/alignment heavy: RelativeLayout or ConstraintLayout

## Step 3: ID naming convention
- EditText: etName
- Button: btnSubmit
- TextView: tvResult
- Spinner: spType
- ListView/Recycler: lvData/rvData

## Step 4: Validation template
- Empty check
- Numeric parse (`toIntOrNull` / `toDoubleOrNull`)
- Special checks (divide by zero, max length, selection required)

## Step 5: Output template
- Same screen result: set TextView
- Quick feedback: Toast
- Next screen: Intent putExtra + getStringExtra

## Step 6: Viva points
- Explain why you used this layout.
- Explain where validation is handled.
- Explain intent data passing key.
