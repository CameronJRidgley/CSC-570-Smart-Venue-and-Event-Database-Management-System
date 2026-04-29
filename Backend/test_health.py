def test_root(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert "ALIVE" in resp.json()["message"]


def test_status(client):
    resp = client.get("/api/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "Connected to FastAPI"
    assert "env" in body


def test_request_id_header(client):
    resp = client.get("/api/status")
    assert "x-request-id" in {k.lower() for k in resp.headers.keys()}
