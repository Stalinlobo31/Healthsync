from .schemas import MedicalTest, Finding
from medical_rules.basic_rules import check_reference_range
from medical_rules.reference_ranges import REFERENCE_RANGES


def evaluate_test(test: MedicalTest) -> Finding:

    # Find reference information for this test
    reference = REFERENCE_RANGES.get(test.name.lower())

    if reference:
        reference_min = reference["min"]
        reference_max = reference["max"]
        source = reference["source"]
        source_url = reference.get("source_url", "")
    else:
        reference_min = test.reference_min
        reference_max = test.reference_max
        source = ""
        source_url = ""

    # Evaluate the value using deterministic rules
    status = check_reference_range(
        test.value,
        reference_min,
        reference_max
    )

    # Select the appropriate rule
    if status == "UNKNOWN":
        rule_id = "NO_REFERENCE_RANGE"

    elif status == "LOW":
        rule_id = "VALUE_BELOW_REFERENCE"

    elif status == "HIGH":
        rule_id = "VALUE_ABOVE_REFERENCE"

    else:
        rule_id = "VALUE_WITHIN_REFERENCE"

    # Return structured finding
    return Finding(
        test=test.name,
        value=test.value,
        unit=test.unit,
        status=status,
        rule_id=rule_id,
        source=source,
        source_url=source_url
    )