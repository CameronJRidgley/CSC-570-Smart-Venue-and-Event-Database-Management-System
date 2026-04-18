def _register(client, email="alice@example.com", password="super-secret-1"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "full_name": "Alice"},
    )


def test_register_then_login_then_me(client):
    r = _register(client)
    assert r.status_code == 201, r.text
    user = r.json()
    assert user["email"] == "alice@example.com"
    assert user["role"] == "attendee"

    r = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "super-secret-1"},
    )
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]

    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["email"] == "alice@example.com"


def test_duplicate_register_rejected(client):
    assert _register(client).status_code == 201
    r = _register(client)
    assert r.status_code == 409
    assert r.json()["error"]["code"] == "http_409"


def test_bad_login(client):
    _register(client)
    r = client.post(
        "/api/auth/login",
        json={"email": "alice@example.com", "password": "wrong-password"},
    )
    assert r.status_code == 401


def test_me_without_token(client):
    r = client.get("/api/auth/me")
    assert r.status_code == 401
