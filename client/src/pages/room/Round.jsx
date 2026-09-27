import {
  useEffect,
  useRef,
  useState
} from "react";

import {
  useLocation,
  useNavigate,
  useParams
} from "react-router-dom";

import "./round.css";

const API =
  `${import.meta.env.VITE_API_URL}/api`;

function Round() {
  const {
    roomCode,
    roundNumber
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

  const currentRound =
    Number(roundNumber);

  const [state, setState] =
    useState(null);

  const [selected, setSelected] =
    useState([]);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [refreshing, setRefreshing] =
    useState(false);

  const initializedSelection =
    useRef(false);

  const loadState = async () => {
    if (!participantId) {
      navigate(
        `/room/${roomCode}`,
        {
          replace: true
        }
      );

      return;
    }

    try {
      const response =
        await fetch(
          `${API}/rooms/${roomCode}/participant/${participantId}`
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to load the round."
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

      if (
        Number(
          data.currentRound
        ) !== currentRound
      ) {
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

        return;
      }

      if (
        data.roundStatus ===
        "completed"
      ) {
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

        return;
      }

      if (
        !initializedSelection.current
      ) {
        setSelected(
          Array.isArray(
            data.selectedParticipants
          )
            ? data.selectedParticipants
            : []
        );

        initializedSelection.current =
          true;
      }

      setState(data);
    } catch {
      setError(
        "Unable to connect to the server."
      );
    }
  };

  useEffect(() => {
    initializedSelection.current =
      false;

    setState(null);
    setSelected([]);
    setError("");

    loadState();

    const interval =
      window.setInterval(
        loadState,
        2000
      );

    return () => {
      window.clearInterval(
        interval
      );
    };
  }, [
    roomCode,
    participantId,
    currentRound
  ]);

  const refreshState = async () => {
    if (
      !participantId ||
      refreshing
    ) {
      return;
    }

    setRefreshing(true);
    setError("");

    await loadState();

    setRefreshing(false);
  };

  const toggleParticipant = (
    participant
  ) => {
    if (!isVoting) {
      return;
    }

    const id =
      String(
        participant.participantId
      );

    setSelected(
      (current) => {
        if (
          current.includes(id)
        ) {
          return current.filter(
            (item) =>
              item !== id
          );
        }

        return [
          ...current,
          id
        ];
      }
    );
  };

  const submitVotes = async () => {
    if (
      submitting ||
      !isVoting
    ) {
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const response =
        await fetch(
          `${API}/rooms/${roomCode}/rounds/${currentRound}/vote`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json"
            },
            body: JSON.stringify({
              participantId,
              selectedParticipants:
                selected
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Unable to save your selections."
        );

        return;
      }

      setState(
        (current) => ({
          ...current,
          hasVoted: true,
          selectedParticipants:
            selected
        })
      );
    } catch {
      setError(
        "Unable to connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!state) {
    return (
      <main className="round-page">
        <section className="round-shell">
          <div className="round-loading">
            <div className="round-loading-icon">
              <img
                src="/icon.png"
                alt=""
              />
            </div>

            <strong>
              Preparing your round...
            </strong>

            <span>
              Just a moment.
            </span>
          </div>
        </section>
      </main>
    );
  }

  const members =
    state.conversationGroup?.members ||
    [];

  const otherMembers =
    members.filter(
      (member) =>
        String(
          member.participantId
        ) !==
        String(participantId)
    );

  const isConversation =
    state.roundStatus ===
    "active";

  const isVoting =
    state.roundStatus ===
    "voting";

  const progress =
    Math.min(
      100,
      (currentRound /
        state.totalRounds) *
        100
    );

  return (
    <main className="round-page">
      <section className="round-shell">
        <header className="round-header">
          <div className="round-brand">
            <img
              src="/icon.png"
              alt="Meetafriend"
            />

            <div>
              <strong>
                Meetafriend
              </strong>

              <span>
                {roomName}
              </span>
            </div>
          </div>

          <div className="round-header-number">
            {currentRound}
            <small>
              /{state.totalRounds}
            </small>
          </div>
        </header>

        <div className="round-content">
          <div className="round-progress-area">
            <div className="round-progress-top">
              <span>
                YOUR JOURNEY
              </span>

              <strong>
                Round {currentRound} of{" "}
                {state.totalRounds}
              </strong>
            </div>

            <div className="round-progress">
              <div
                className="round-progress-fill"
                style={{
                  width:
                    `${progress}%`
                }}
              />
            </div>

            <div className="round-progress-dots">
              {Array.from(
                {
                  length:
                    state.totalRounds
                }
              ).map(
                (_, index) => {
                  const number =
                    index + 1;

                  return (
                    <div
                      key={number}
                      className={
                        number <
                        currentRound
                          ? "round-dot completed"
                          : number ===
                            currentRound
                          ? "round-dot active"
                          : "round-dot"
                      }
                    >
                      {number <
                      currentRound
                        ? "✓"
                        : number}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          <div className="round-title">
            <span className="round-eyebrow">
              {isConversation
                ? "CONVERSATION ROUND"
                : "CONNECTION ROUND"}
            </span>

            <h1>
              {isConversation
                ? "Meet your group."
                : "Who would you like to connect with?"}
            </h1>

            <p>
              {isConversation
                ? "Take a moment to introduce yourselves, talk and find something you have in common."
                : "Choose one or more people from your group you'd like to connect with."}
            </p>
          </div>

          <div className="round-group-card">
            <div className="round-group-top">
              <div>
                <span>
                  YOUR GROUP
                </span>

                <strong>
                  Group{" "}
                  {state
                    .conversationGroup
                    ?.groupNumber ||
                    ""}
                </strong>
              </div>

              <div className="round-member-count">
                {members.length}

                <span>
                  people
                </span>
              </div>
            </div>

            <div className="round-members">
              {members.map(
                (member) => {
                  const id =
                    String(
                      member.participantId
                    );

                  const isYou =
                    id ===
                    String(
                      participantId
                    );

                  const isSelected =
                    selected.includes(
                      id
                    );

                  return (
                    <div
                      key={id}
                      className={
                        isSelected
                          ? "round-member selected"
                          : isYou
                          ? "round-member you"
                          : isVoting
                          ? "round-member clickable"
                          : "round-member"
                      }
                      onClick={() => {
                        if (
                          isVoting &&
                          !isYou &&
                          !submitting
                        ) {
                          toggleParticipant(
                            member
                          );
                        }
                      }}
                    >
                      <div className="round-avatar">
                        {(
                          member.username ||
                          "P"
                        )
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="round-member-info">
                        <strong>
                          {member.username ||
                            "Participant"}
                        </strong>

                        {isYou ? (
                          <span>
                            That's you
                          </span>
                        ) : isSelected ? (
                          <span>
                            Selected
                          </span>
                        ) : isVoting ? (
                          <span>
                            Tap to select
                          </span>
                        ) : (
                          <span>
                            Participant
                          </span>
                        )}
                      </div>

                      {isVoting &&
                        !isYou && (
                          <div
                            className={
                              isSelected
                                ? "round-select selected"
                                : "round-select"
                            }
                          >
                            {isSelected
                              ? "✓"
                              : ""}
                          </div>
                        )}
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {isConversation ? (
            <>
              <div className="round-conversation-card">
                <div className="round-conversation-icon">
                  ✦
                </div>

                <div>
                  <strong>
                    Take your time.
                  </strong>

                  <p>
                    Talk, laugh and get to
                    know the people around
                    you.
                  </p>
                </div>
              </div>

              <div className="round-waiting">
                <div className="round-waiting-icon">
                  <span />
                </div>

                <div>
                  <strong>
                    Enjoy the conversation
                  </strong>

                  <span>
                    Voting will appear
                    automatically when the
                    organizer finishes the
                    round.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={
                    refreshState
                  }
                  disabled={
                    refreshing
                  }
                >
                  {refreshing
                    ? "Checking..."
                    : "Check status"}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="round-vote-heading">
                <div>
                  <span>
                    YOUR CHOICE
                  </span>

                  <strong>
                    {selected.length ===
                    0
                      ? "Make your selections"
                      : `${selected.length} selected`}
                  </strong>
                </div>

                <span className="round-private">
                  PRIVATE
                </span>
              </div>

              {selected.length ===
                0 && (
                <div className="round-hint">
                  Tap one or more people
                  you'd like to connect
                  with.
                </div>
              )}

              {state.hasVoted && (
                <div className="round-hint">
                  You can change your
                  selections while voting
                  is open.
                </div>
              )}

              {error && (
                <div className="round-error">
                  <span>!</span>
                  {error}
                </div>
              )}

              <button
                type="button"
                className="round-submit"
                disabled={
                  submitting ||
                  otherMembers.length ===
                    0
                }
                onClick={
                  submitVotes
                }
              >
                <span>
                  {submitting
                    ? "Saving..."
                    : state.hasVoted
                    ? "Update selections"
                    : "Submit selections"}
                </span>

                {!submitting && (
                  <span className="round-submit-arrow">
                    →
                  </span>
                )}
              </button>
            </>
          )}

          <div className="round-bottom">
            <span>
              ROUND {currentRound}
            </span>

            <span>
              •
            </span>

            <span>
              {isConversation
                ? "CONVERSATION"
                : "VOTING OPEN"}
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Round;