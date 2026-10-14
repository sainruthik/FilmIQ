from pipeline.tasks import AcquisitionReport, BidScenario


def sample_report(**overrides) -> AcquisitionReport:
    fields = dict(
        executive_summary="Summary.",
        investment_thesis="- Strong cast",
        conservative=BidScenario(rights_structure="Non-exclusive US", price="$1M", rationale="Per comps."),
        base_case=BidScenario(rights_structure="Exclusive US", price="$2M", rationale="Per comps."),
        aggressive=BidScenario(rights_structure="Exclusive NA", price="$2.5M-$3M", rationale="Per comps."),
        walk_away_ceiling="$3M",
        recommendation="Lead with base case.",
        source_conflicts=[],
    )
    return AcquisitionReport(**{**fields, **overrides})
