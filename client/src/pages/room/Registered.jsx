import {
  useEffect,
  useState
} from "react";

import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import "./Registered.css";

const API =
  `${import.meta.env.VITE_API_URL}/api`;

function Registered() {
  const {
    roomCode
  } = useParams();

  const location =
    useLocation();

  const navigate =
    useNavigate();

  const savedParticipant =
    JSON.parse(
      localStorage.getItem(
        "meetafriendParticipant"
      ) || "null"
    );

  const participantId =
    location.state?.participantId ||
    savedParticipant?.participantId;

  const username =
    location.state?.username ||
    savedParticipant?.username ||
    "Participant";

  const roomName =
    location.state?.roomName ||
    savedParticipant?.roomName ||
    "Meetafriend";

  const [status, setStatus] =
    useState(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState(new Date());

  useEffect(() => {
    if (!participantId) {
      navigate(
        `/room/${roomCode}`,
        {
          replace: true
        }
      );

      return;
    }

    let cancelled = false;

    const loadStatus = async () => {
      try {
        const response =
          await fetch(
            `${API}/rooms/${roomCode}/participant/${participantId}`
          );

        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setError(
            data.message ||
              "Unable to load your meetup."
          );

          return;
        }

        setStatus(data);

        setLastUpdated(
          new Date()
        );

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

        if (
          data.matchmakingCompleted
        ) {
          return;
        }

        if (
          data.currentRound > 0 &&
          (
            data.roundStatus ===
              "active" ||
            data.roundStatus ===
              "voting"
          )
        ) {
          navigate(
            `/room/${roomCode}/round/${data.currentRound}`,
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

          return;
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

    loadStatus();

    const interval =
      window.setInterval(
        loadStatus,
        2000
      );

    return () => {
      cancelled = true;

      window.clearInterval(
        interval
      );
    };
  }, [
    roomCode,
    participantId,
    navigate
  ]);

  if (loading && !status) {
    return (
      <main className="registered-page">
        <section className="registered-shell">
          <div className="registered-loading">
            <div className="registered-loading-icon">
              <img
                src="/icon.png"
                alt=""
              />
            </div>

            <strong>
              Getting everything ready...
            </strong>

            <span>
              Please wait a moment.
            </span>
          </div>
        </section>
      </main>
    );
  }

  if (error && !status) {
    return (
      <main className="registered-page">
        <section className="registered-shell">
          <header className="registered-header">
            <div className="registered-brand">
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
          </header>

          <div className="registered-error">
            <div className="registered-error-icon">
              !
            </div>

            <span className="registered-eyebrow">
              CONNECTION ERROR
            </span>

            <h1>
              Something went wrong.
            </h1>

            <p>
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
            >
              Try again
            </button>
          </div>
        </section>
      </main>
    );
  }

  const currentRound =
    Number(
      status?.currentRound || 0
    );

  const totalRounds =
    Number(
      status?.totalRounds || 5
    );

  const isRegistration =
    currentRound === 0;

  const roundProgress =
    Math.min(
      100,
      Math.max(
        0,
        (currentRound /
          totalRounds) *
          100
      )
    );

  const members =
    status?.conversationGroup
      ?.members || [];

  const isMatchmaking =
    status?.phase ===
      "matchmaking" ||
    status?.phase ===
      "processing";

  const isVoting =
    status?.roundStatus ===
    "voting";

  return (
    <main className="registered-page">
      <section className="registered-shell">
        <header className="registered-header">
          <div className="registered-brand">
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

          <div className="registered-header-icon">
            ✦
          </div>
        </header>

        <div className="registered-content">
          <div className="registered-welcome">
            <span className="registered-eyebrow">
              {isRegistration
                ? "YOU'RE IN"
                : `ROUND ${currentRound} OF ${totalRounds}`}
            </span>

            <h1>
              Hey,{" "}
              <span>
                {username}
              </span>
              .
            </h1>

            <p>
              {isRegistration
                ? "Everything is ready. Your meetup will begin soon."
                : isVoting
                ? "Voting is open. Choose the people you'd like to connect with."
                : "Your next conversation is being prepared."}
            </p>
          </div>

          <div className="registered-status-card">
            <div className="registered-status-glow" />

            <div className="registered-status-icon">
              {isMatchmaking
                ? "♥"
                : isVoting
                ? "✓"
                : "✦"}
            </div>

            <span className="registered-status-label">
              {isMatchmaking
                ? "MATCHMAKING"
                : isVoting
                ? "VOTING OPEN"
                : isRegistration
                ? "MEETUP STATUS"
                : "NEXT ROUND"}
            </span>

            <h2>
              {isMatchmaking
                ? "Finding your connections"
                : isVoting
                ? "Choose your connections."
                : isRegistration
                ? "You're ready."
                : "Get ready to meet."}
            </h2>

            <p>
              {isMatchmaking
                ? "We're putting everything together."
                : isVoting
                ? "Your selections are private and can be updated while voting is open."
                : isRegistration
                ? "Stay here while the organizer gets things started."
                : "Your group will appear as soon as the next round begins."}
            </p>
          </div>

          <div className="registered-round-card">
            <div className="registered-round-heading">
              <div>
                <span>
                  YOUR PROGRESS
                </span>

                <strong>
                  {currentRound === 0
                    ? "Starting soon"
                    : `Round ${currentRound} of ${totalRounds}`}
                </strong>
              </div>

              <div className="registered-round-count">
                {currentRound}/
                {totalRounds}
              </div>
            </div>

            <div className="registered-progress">
              <div
                className="registered-progress-fill"
                style={{
                  width:
                    `${roundProgress}%`
                }}
              />
            </div>

            <div className="registered-round-dots">
              {Array.from(
                {
                  length:
                    totalRounds
                }
              ).map(
                (_, index) => {
                  const number =
                    index + 1;

                  const completed =
                    number <
                    currentRound;

                  const active =
                    number ===
                    currentRound;

                  return (
                    <div
                      key={number}
                      className={
                        completed
                          ? "registered-round-dot completed"
                          : active
                          ? "registered-round-dot active"
                          : "registered-round-dot"
                      }
                    >
                      <span>
                        {completed
                          ? "✓"
                          : number}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {currentRound > 0 &&
            members.length > 0 && (
              <div className="registered-group-card">
                <div className="registered-group-heading">
                  <div>
                    <span>
                      YOUR GROUP
                    </span>

                    <strong>
                      Group{" "}
                      {status
                        ?.conversationGroup
                        ?.groupNumber ||
                        ""}
                    </strong>
                  </div>

                  <span className="registered-live">
                    {isVoting
                      ? "VOTING"
                      : "ACTIVE"}
                  </span>
                </div>

                <div className="registered-members">
                  {members.map(
                    (member) => {
                      const isYou =
                        String(
                          member.participantId
                        ) ===
                        String(
                          participantId
                        );

                      return (
                        <div
                          className={
                            isYou
                              ? "registered-member you"
                              : "registered-member"
                          }
                          key={
                            member.participantId
                          }
                        >
                          <div className="registered-avatar">
                            {(
                              member.username ||
                              "P"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </div>

                          <div>
                            <strong>
                              {member.username ||
                                "Participant"}
                            </strong>

                            {isYou && (
                              <span>
                                You
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </div>
            )}

          <div className="registered-info">
            <div className="registered-info-icon">
              ✓
            </div>

            <div>
              <strong>
                {isVoting
                  ? "Voting is open"
                  : "You're all set"}
              </strong>

              <span>
                {status?.hasVoted
                  ? "Your selection has been saved. You can update it while voting remains open."
                  : "We'll let you know when there's something to do."}
              </span>
            </div>
          </div>

          <div className="registered-room">
            <span>
              {roomName}
            </span>

            <span>
              ROOM {roomCode}
            </span>
          </div>
        </div>

        <footer className="registered-footer">
          <span>
            Updated{" "}
            {lastUpdated.toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit"
              }
            )}
          </span>

          <span>
            •
          </span>

          <span>
            Stay nearby
          </span>
        </footer>
      </section>
    </main>
  );
}

export default Registered;