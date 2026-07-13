"""Conversion funnel tracking — stubbed for hackathon demo."""

_funnel: dict = {}


def track_stage(customer_id, stage):
    if customer_id not in _funnel:
        _funnel[customer_id] = []
    _funnel[customer_id].append(stage)


def get_funnel_metrics():
    stages = {}
    for customer_stages in _funnel.values():
        for stage in customer_stages:
            stages[stage] = stages.get(stage, 0) + 1
    return stages


def get_conversion_rate(from_stage, to_stage):
    from_count = sum(1 for s in _funnel.values() if from_stage in s)
    to_count = sum(1 for s in _funnel.values() if to_stage in s)
    if from_count == 0:
        return 0.0
    return to_count / from_count
