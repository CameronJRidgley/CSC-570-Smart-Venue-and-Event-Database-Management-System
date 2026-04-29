"""Smoke test: event listing with no data."""


def test_list_events_empty(client):
    r = client.get("/api/events")
    assert r.status_code == 200
    assert r.json() == []


def test_get_unknown_event_returns_404(client):
    r = client.get("/api/events/9999")
    assert r.status_code == 404
    body = r.json()
    assert body["error"]["code"] == "http_404"
    assert body["error"]["path"] == "/api/events/9999"
