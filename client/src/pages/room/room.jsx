import {
  useEffect,
  useState
} from "react";

import {
  useNavigate,
  useParams
} from "react-router-dom";

import "./room.css";

const API =
  "http://localhost:5000/api";

function Room() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] =
    useState(null);

  const [username, setUsername] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [joining, setJoining] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    let cancelled = false;

    const loadRoom = async () => {
      try {
        const saved =
          JSON.parse(
            localStorage.getItem(
              "meetafriendParticipant"
            ) || "null"
          );

        if (
          saved &&
          saved.roomCode === roomCode &&
          saved.participantId
        ) {
          const statusResponse =
            await fetch(
              `${API}/rooms/${roomCode}/participant/${saved.participantId}`
            );

          if (statusResponse.ok) {
            const status =
              await statusResponse.json();

            if (!cancelled) {
              navigate(
                `/room/${roomCode}/registered`,
                {
                  state: {
                    participantId:
                      saved.participantId,
                    username:
                      saved.username ||
                      status.username,
                    roomName:
                      saved.roomName ||
                      status.roomName
                  },
                  replace: true
                }
              );
            }

            return;
          }

          localStorage.removeItem(
            "meetafriendParticipant"
          );
        }

        const response =
          await fetch(
            `${API}/rooms/${roomCode}`
          );

        const data =
          await response.json();

        if (!response.ok) {
          if (!cancelled) {
            setError(
              data.message ||
                "Room not found."
            );
          }

          return;
        }

        if (!cancelled) {
          setRoom(data.room);
        }
      } catch {
        if (!cancelled) {
          setError(
            "Unable to connect to the server."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadRoom();

    return () => {
      cancelled = true;
    };
  }, [
    roomCode,
    navigate
  ]);

  const joinRoom = async (event) => {
    event.preventDefault();

    const cleanUsername =
      username.trim();

    if (!cleanUsername) {
      setError(
        "Enter your username."
      );

      return;
    }

    setError("");
    setJoining(true);

    try {
      const response =
        await fetch(
          `${API}/rooms/${roomCode}/join`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              username:
                cleanUsername
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to join the room."
        );

        return;
      }

      localStorage.setItem(
        "meetafriendParticipant",
        JSON.stringify({
          participantId:
            data.participantId,
          username:
            data.username,
          roomCode:
            data.roomCode,
          roomName:
            data.roomName
        })
      );

      navigate(
        `/room/${roomCode}/registered`,
        {
          state: {
            participantId:
              data.participantId,
            username:
              data.username,
            roomName:
              data.roomName
          },
          replace: true
        }
      );
    } catch {
      setError(
        "Unable to connect to the server."
      );
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <main className="room-page">
        <div className="room-loading">
          <div className="room-loading-mark">
            <img
              src="/icon.png"
              alt=""
            />
          </div>

          <span>
            Loading meetup...
          </span>
        </div>
      </main>
    );
  }

  if (error && !room) {
    return (
      <main className="room-page">
        <section className="room-shell room-error-shell">
          <div className="room-topbar">
            <div className="room-brand">
              <img
                src="/icon.png"
                alt="Meetafriend"
              />

              <span>
                Meetafriend
              </span>
            </div>
          </div>

          <div className="room-error-content">
            <div className="room-error-icon">
              !
            </div>

            <span className="room-label">
              SOMETHING WENT WRONG
            </span>

            <h1>
              This meetup isn't
              available.
            </h1>

            <p>
              {error}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="room-page">
      <section className="room-shell">
        <header className="room-topbar">
          <div className="room-brand">
            <img
              src="/icon.png"
              alt="Meetafriend"
            />

            <div>
              <strong>
                Meetafriend
              </strong>

              <span>
                Heroes Dutch Comic Con
              </span>
            </div>
          </div>

          <div className="room-top-icon">
            ✦
          </div>
        </header>

        <div className="room-hero">
          <div className="room-gradient-card">
            <div className="room-gradient-orb room-orb-one" />
            <div className="room-gradient-orb room-orb-two" />

            <span className="room-gradient-label">
              MEETAFRIEND
            </span>

            <h2>
              Meet someone
              <br />
              worth knowing.
            </h2>

            <p>
              One room. New people.
              A chance to make a
              connection.
            </p>
          </div>

          <div className="room-intro">
            <span className="room-label">
              JOIN THE MEETUP
            </span>

            <h1>
              Ready to meet
              <br />
              your match?
            </h1>

            <p>
              Enter your details to
              join this meetup and
              get started.
            </p>
          </div>

          <form
            className="room-form"
            onSubmit={joinRoom}
          >
            <label
              className="room-field"
            >
              <span>
                Username
              </span>

              <input
                type="text"
                value={username}
                onChange={(event) =>
                  setUsername(
                    event.target.value
                  )
                }
                placeholder="Choose a username"
                autoComplete="nickname"
                maxLength={30}
                disabled={joining}
              />
            </label>

            {error && (
              <div className="room-inline-error">
                <span>!</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="room-submit"
              disabled={joining}
            >
              <span>
                {joining
                  ? "Joining..."
                  : "Join Meetafriend"}
              </span>

              {!joining && (
                <span className="room-submit-arrow">
                  →
                </span>
              )}
            </button>

            <div className="room-trust">
              <span className="room-trust-dot">
                ✓
              </span>

              <span>
                Your meetup details
                stay private.
              </span>
            </div>
          </form>
        </div>

        <footer className="room-footer">
          <span>
            {room?.name ||
              "Meetafriend"}
          </span>

          <span className="room-footer-dot">
            •
          </span>

          <span>
            {room?.roomCode ||
              roomCode}
          </span>
        </footer>
      </section>
    </main>
  );
}

export default Room;