"""Behavioral scoring — stubbed for hackathon demo."""

_events: dict = {}
_signals: dict = {}


def track_event(customer_id, event_type, metadata=None):
    if customer_id not in _events:
        _events[customer_id] = []
    _events[customer_id].append({"event_type": event_type, "metadata": metadata or {}})


def get_behavior_score(customer_id):
    events = _events.get(customer_id, [])
    return min(len(events) * 10, 100)


def get_signals(customer_id):
    return {"events_tracked": len(_events.get(customer_id, []))}
