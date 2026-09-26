import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./admindashboard.css";

function AdminDashboard() {
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  const [roomName, setRoomName] = useState("");
  const [groupName, setGroupName] = useState("");

  const [showCreate, setShowCreate] =
    useState(false);

  const [showCreateGroup, setShowCreateGroup] =
    useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [creatingGroup, setCreatingGroup] =
    useState(false);
  const [actionLoading, setActionLoading] =
    useState(false);

  const [matchmaking, setMatchmaking] =
    useState(null);

  const [selectedVoteRound, setSelectedVoteRound] =
    useState(2);

  const [matchmakingLoading, setMatchmakingLoading] =
    useState(false);

  const [roundActionLoading, setRoundActionLoading] =
    useState(false);

  const [confirmModal, setConfirmModal] =
    useState({
      open: false,
      title: "",
      message: "",
      action: null
    });

  const token =
    sessionStorage.getItem(
      "meetafriendToken"
    );

  const authHeaders = {
    Authorization: `Bearer ${token}`
  };

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/rooms`,
        {
          headers: authHeaders
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to load rooms."
        );
        return;
      }

      setRooms(data.rooms || []);
    } catch {
      setError(
        "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadRoom = async (roomCode) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/participants`,
        {
          headers: authHeaders
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to load room."
        );
        return null;
      }

      return data.room;
    } catch {
      setError(
        "Could not connect to the server."
      );

      return null;
    }
  };

  const refreshSelectedRoom =
    async () => {
      if (!selectedRoom) return;

      const room =
        await loadRoom(
          selectedRoom.roomCode
        );

      if (!room) return;

      setSelectedRoom(room);

      setRooms(
        (currentRooms) =>
          currentRooms.map(
            (item) =>
              item.roomCode ===
              room.roomCode
                ? {
                    ...item,
                    name: room.name,
                    participants:
                      room.participants,
                    groups:
                      room.groups,
                    participantCount:
                      room.participants
                        .length
                  }
                : item
          )
      );

      setSelectedVoteRound(
        Math.max(
          2,
          Number(room.currentRound) || 2
        )
      );

      await loadMatchmaking(
        room.roomCode
      );
    };

  const openRoom = async (room) => {
    setError("");
    setSelectedGroupId(null);
    setMatchmaking(null);

    const loadedRoom =
      await loadRoom(
        room.roomCode
      );

    if (!loadedRoom) return;

    setSelectedRoom(
      loadedRoom
    );

    setSelectedVoteRound(
      Math.max(
        2,
        Number(loadedRoom.currentRound) || 2
      )
    );

    await loadMatchmaking(
      loadedRoom.roomCode
    );
  };

  const createRoom = async () => {
    if (!roomName.trim()) {
      setError(
        "Enter a room name."
      );
      return;
    }

    setCreating(true);
    setError("");

    try {
      const response =
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/rooms`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...authHeaders
            },
            body: JSON.stringify({
              name: roomName.trim(),
              totalRounds: 5
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to create room."
        );
        return;
      }

      setRoomName("");
      setShowCreate(false);

      await loadRooms();

      const loadedRoom =
        await loadRoom(
          data.room.roomCode
        );

      if (loadedRoom) {
        setSelectedRoom(
          loadedRoom
        );
      }
    } catch {
      setError(
        "Could not connect to the server."
      );
    } finally {
      setCreating(false);
    }
  };

  const createGroup = async () => {
    if (!selectedRoom) return;

    if (!groupName.trim()) {
      setError(
        "Enter a group name."
      );
      return;
    }

    setCreatingGroup(true);
    setError("");

    try {
      const response =
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/groups`,  
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...authHeaders
            },
            body: JSON.stringify({
              name:
                groupName.trim()
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to create group."
        );
        return;
      }

      setGroupName("");
      setShowCreateGroup(false);

      setSelectedRoom(
        data.room
      );
    } catch {
      setError(
        "Could not connect to the server."
      );
    } finally {
      setCreatingGroup(false);
    }
  };

  const addUserToGroup =
    async (
      groupId,
      participantId
    ) => {
      if (
        !selectedRoom ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/groups/${groupId}/members`,
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                ...authHeaders
              },
              body: JSON.stringify({
                participantId
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to add user."
          );
          return;
        }

        setSelectedGroupId(
          null
        );

        setSelectedRoom(
          data.room
        );
      } catch {
        setError(
          "Could not connect to the server."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const removeUserFromGroup =
    async (
      groupId,
      participantId
    ) => {
      if (
        !selectedRoom ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/groups/${groupId}/members/${participantId}`,
            {
              method: "DELETE",
              headers:
                authHeaders
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to remove user."
          );
          return;
        }

        setSelectedRoom(
          data.room
        );
      } catch {
        setError(
          "Could not connect to the server."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const closeConfirmModal =
    () => {
      setConfirmModal({
        open: false,
        title: "",
        message: "",
        action: null
      });
    };

  const deleteGroup =
    (groupId) => {
      if (
        !selectedRoom ||
        actionLoading
      ) {
        return;
      }

      setConfirmModal({
        open: true,
        title: "Delete group?",
        message:
          "All participants will be removed from this group. They can be assigned to another group later.",
        action: () =>
          performDeleteGroup(
            groupId
          )
      });
    };

  const performDeleteGroup =
    async (groupId) => {
      closeConfirmModal();

      if (
        !selectedRoom ||
        actionLoading
      ) {
        return;
      }

      setActionLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/groups/${groupId}`,
            {
              method: "DELETE",
              headers:
                authHeaders
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to delete group."
          );
          return;
        }

        setSelectedGroupId(
          null
        );

        setSelectedRoom(
          data.room
        );
      } catch {
        setError(
          "Could not connect to the server."
        );
      } finally {
        setActionLoading(false);
      }
    };

  const deleteRoom =
    (roomCode) => {
      setConfirmModal({
        open: true,
        title: "Delete room?",
        message:
          "This will remove the room from your active rooms. Participants will no longer be able to join it.",
        action: () =>
          performDeleteRoom(
            roomCode
          )
      });
    };

  const performDeleteRoom =
    async (roomCode) => {
      closeConfirmModal();
      setError("");

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}`,
            {
              method: "DELETE",
              headers:
                authHeaders
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to delete room."
          );
          return;
        }

        setRooms(
          (currentRooms) =>
            currentRooms.filter(
              (room) =>
                room.roomCode !==
                roomCode
            )
        );

        if (
          selectedRoom?.roomCode ===
          roomCode
        ) {
          setSelectedRoom(
            null
          );
          setSelectedGroupId(
            null
          );
          setMatchmaking(
            null
          );
        }
      } catch {
        setError(
          "Could not connect to the server."
        );
      }
    };

  const startRound = async () => {
    if (
      !selectedRoom ||
      roundActionLoading
    ) {
      return;
    }

    const nextRound =
      Number(
        selectedRoom.currentRound
      ) + 1;

    setRoundActionLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/rounds/start`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...authHeaders
            },
            body: JSON.stringify({
              roundNumber:
                nextRound
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        setError(
          data.message ||
            "Failed to start round."
        );
        return;
      }

      setSelectedRoom(
        data.room
      );
    } catch {
      setError(
        "Could not connect to the server."
      );
    } finally {
      setRoundActionLoading(
        false
      );
    }
  };

  const completeRound =
    async () => {
      if (
        !selectedRoom ||
        roundActionLoading ||
        !selectedRoom.currentRound
      ) {
        return;
      }

      setRoundActionLoading(true);
      setError("");

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/rounds/${selectedRoom.currentRound}/complete`,
            {
              method: "POST",
              headers:
                authHeaders
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to complete round."
          );
          return;
        }

        setSelectedRoom(
          data.room
        );
      } catch {
        setError(
          "Could not connect to the server."
        );
      } finally {
        setRoundActionLoading(
          false
        );
      }
    };

  const loadMatchmaking =
    async (roomCode) => {
      setMatchmakingLoading(
        true
      );

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${roomCode}/matchmaking`,
            {
              headers:
                authHeaders
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to load matchmaking results."
          );
          return;
        }

        setMatchmaking(
          data
        );
      } catch {
        setError(
          "Could not connect to the server."
        );
      } finally {
        setMatchmakingLoading(
          false
        );
      }
    };

  const finalizeMatchmaking =
    async () => {
      if (
        !selectedRoom ||
        roundActionLoading
      ) {
        return;
      }

      setRoundActionLoading(
        true
      );
      setError("");

      try {
        const response =
          await fetch(
            `${import.meta.env.VITE_API_URL}/api/rooms/${selectedRoom.roomCode}/matchmaking/finalize`,
            {
              method: "POST",
              headers:
                authHeaders
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          setError(
            data.message ||
              "Failed to finalize matchmaking."
          );
          return;
        }

        const room =
          await loadRoom(
            selectedRoom.roomCode
          );

        if (room) {
          setSelectedRoom(
            room
          );
        }

        await loadMatchmaking(
          selectedRoom.roomCode
        );
      } catch {
        setError(
          "Could not connect to the server."
        );
      } finally {
        setRoundActionLoading(
          false
        );
      }
    };

  const logout = () => {
    sessionStorage.removeItem(
      "meetafriendToken"
    );

    window.location.href =
      "/admin";
  };

  const roomUrl =
    selectedRoom
      ? `${window.location.origin}/room/${selectedRoom.roomCode}`
      : "";

  const assignedUserIds =
    selectedRoom?.groups?.flatMap(
      (group) =>
        (group.members || []).map(
          (member) =>
            String(
              member.participantId
            )
        )
    ) || [];

  const unassignedUsers =
    selectedRoom?.participants?.filter(
      (participant) =>
        !assignedUserIds.includes(
          String(
            participant._id
          )
        )
    ) || [];

  const getGroupName =
    (groupId) => {
      const group =
        selectedRoom?.groups?.find(
          (item) =>
            item._id ===
            groupId
        );

      return (
        group?.name ||
        "Group"
      );
    };

  const currentRound =
    selectedRoom?.rounds?.find(
      (round) =>
        round.roundNumber ===
        selectedRoom.currentRound
    );

  const currentRoundComplete =
    currentRound?.status ===
    "completed";

  const currentRoundActive =
    currentRound?.status ===
      "active" ||
    currentRound?.status ===
      "voting";

  const allRoundsComplete =
    selectedRoom?.rounds?.length ===
      selectedRoom?.totalRounds &&
    selectedRoom?.rounds?.every(
      (round) =>
        round.status ===
        "completed"
    );

  const canStartRound =
    selectedRoom &&
    !selectedRoom.matchmakingCompleted &&
    !currentRoundActive &&
    !allRoundsComplete &&
    selectedRoom.participants
      ?.length >= 2;

  const canCompleteRound =
    selectedRoom &&
    currentRoundActive;

  const canFinalize =
    selectedRoom &&
    !selectedRoom.matchmakingCompleted &&
    allRoundsComplete;

  const voteRounds =
    selectedRoom?.rounds?.filter(
      (round) =>
        round.roundNumber >= 2
    ) || [];

  const selectedVoteRoundData =
    selectedRoom?.rounds?.find(
      (round) =>
        round.roundNumber ===
        selectedVoteRound
    );

  const roundSelections =
    matchmaking?.selections?.filter(
      (selection) =>
        selection.roundNumber ===
        selectedVoteRound
    ) || [];

  const votingParticipantCount =
    selectedRoom?.participants?.length || 0;

  const submittedVoteCount =
    roundSelections.length;

  return (
    <main className="admin-dashboard">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <img
            src="/icon.png"
            alt="Meetafriend"
          />

          <span>
            meetafriend
          </span>
        </div>

        <button
          className="logout-button"
          onClick={logout}
        >
          Logout
        </button>
      </header>

      <section className="dashboard-content">
        <div className="dashboard-top">
          <div>
            <span className="dashboard-eyebrow">
              ADMIN DASHBOARD
            </span>

            <h1>
              Your
              <br />
              <span>rooms.</span>
            </h1>
          </div>

          <button
            className="new-room-button"
            onClick={() => {
              setShowCreate(
                true
              );
              setSelectedRoom(
                null
              );
              setError("");
            }}
          >
            <span>+</span>
            Create room
          </button>
        </div>

        {error && (
          <p className="dashboard-error">
            {error}
          </p>
        )}

        {showCreate && (
          <div className="create-room-card">
            <h2>
              Create a room
            </h2>

            <p>
              Give your meetup a
              name.
            </p>

            <input
              type="text"
              placeholder="e.g. Friday Meetup"
              value={roomName}
              onChange={(event) =>
                setRoomName(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  createRoom();
                }
              }}
              autoFocus
            />

            <div className="create-room-actions">
              <button
                className="cancel-button"
                onClick={() => {
                  setShowCreate(
                    false
                  );
                  setRoomName("");
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                className="create-confirm-button"
                onClick={
                  createRoom
                }
                disabled={
                  creating
                }
              >
                {creating
                  ? "Creating..."
                  : "Create room →"}
              </button>
            </div>
          </div>
        )}

        {!selectedRoom &&
          !showCreate && (
            <div className="rooms-section">
              <div className="section-heading">
                <span>
                  ACTIVE ROOMS
                </span>

                <span>
                  {rooms.length}
                </span>
              </div>

              {loading ? (
                <div className="empty-state">
                  Loading rooms...
                </div>
              ) : rooms.length ===
                0 ? (
                <div className="empty-state">
                  <h2>
                    No rooms yet.
                  </h2>

                  <p>
                    Create your
                    first room to
                    get started.
                  </p>
                </div>
              ) : (
                <div className="rooms-list">
                  {rooms.map(
                    (room) => (
                      <div
                        className="room-list-item"
                        key={
                          room._id
                        }
                      >
                        <div className="room-list-info">
                          <h2>
                            {
                              room.name
                            }
                          </h2>

                          <span>
                            {
                              room.roomCode
                            }
                          </span>
                        </div>

                        <div className="room-list-meta">
                          <span>
                            {room.participantCount ||
                              room
                                .participants
                                ?.length ||
                              0}{" "}
                            participant
                            {(room.participantCount ||
                              room
                                .participants
                                ?.length ||
                              0) !==
                            1
                              ? "s"
                              : ""}
                          </span>

                          <button
                            onClick={() =>
                              openRoom(
                                room
                              )
                            }
                          >
                            Open
                          </button>

                          <button
                            className="delete-button"
                            onClick={() =>
                              deleteRoom(
                                room.roomCode
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          )}

        {selectedRoom && (
          <div className="selected-room">
            <button
              className="back-button"
              onClick={() => {
                setSelectedRoom(
                  null
                );
                setSelectedGroupId(
                  null
                );
                setMatchmaking(
                  null
                );
                setError("");
              }}
            >
              ← All rooms
            </button>

            <div className="selected-room-header">
              <div>
                <span className="dashboard-eyebrow">
                  ACTIVE ROOM
                </span>

                <h2>
                  {
                    selectedRoom.name
                  }
                </h2>

                <p>
                  Room code:{" "}
                  <strong>
                    {
                      selectedRoom.roomCode
                    }
                  </strong>
                </p>
              </div>

              <button
                className="delete-button large"
                onClick={() =>
                  deleteRoom(
                    selectedRoom.roomCode
                  )
                }
              >
                Delete room
              </button>
            </div>

            <div className="room-management">
              <div className="qr-card">
                <QRCodeSVG
                  value={roomUrl}
                  size={260}
                  level="H"
                  includeMargin
                />

                <strong>
                  Scan to join
                </strong>

                <span>
                  {roomUrl}
                </span>
              </div>

              <div className="participants-card">
                <div className="participants-heading">
                  <div>
                    <span>
                      REGISTERED USERS
                    </span>

                    <h3>
                      {
                        selectedRoom
                          .participants
                          ?.length
                      }
                    </h3>
                  </div>

                  <button
                    className="refresh-button"
                    onClick={
                      refreshSelectedRoom
                    }
                  >
                    Refresh
                  </button>
                </div>

                {selectedRoom
                  .participants
                  ?.length >
                0 ? (
                  <div className="participants-list">
                    {selectedRoom.participants.map(
                      (
                        participant
                      ) => {
                        const assigned =
                          assignedUserIds.includes(
                            String(
                              participant._id
                            )
                          );

                        return (
                          <div
                            className="participant"
                            key={
                              participant._id
                            }
                          >
                            <span>
                              {
                                participant.username
                              }
                            </span>

                            <span
                              className={
                                assigned
                                  ? "user-assigned"
                                  : "user-unassigned"
                              }
                            >
                              {assigned
                                ? "Assigned"
                                : "Unassigned"}
                            </span>
                          </div>
                        );
                      }
                    )}
                  </div>
                ) : (
                  <p className="no-participants">
                    Nobody has
                    joined yet.
                  </p>
                )}
              </div>
            </div>

            <div className="matchmaking-panel">
              <div className="management-section-header">
                <div>
                  <span className="dashboard-eyebrow">
                    MATCHMAKING
                  </span>

                  <h3>
                    Conversation rounds
                  </h3>
                </div>

                <div className="matchmaking-status">
                  {selectedRoom.matchmakingCompleted
                    ? "COMPLETE"
                    : currentRoundActive
                    ? `ROUND ${selectedRoom.currentRound} ACTIVE`
                    : allRoundsComplete
                    ? "READY TO FINALIZE"
                    : `ROUND ${selectedRoom.currentRound} / ${selectedRoom.totalRounds}`}
                </div>
              </div>

              <div className="matchmaking-controls">
                {!selectedRoom.matchmakingCompleted &&
                  !allRoundsComplete &&
                  !currentRoundActive && (
                    <button
                      className="primary-management-button"
                      onClick={
                        startRound
                      }
                      disabled={
                        !canStartRound ||
                        roundActionLoading
                      }
                    >
                      {roundActionLoading
                        ? "Starting..."
                        : `Start Round ${
                            Number(
                              selectedRoom.currentRound
                            ) + 1
                          }`}
                    </button>
                  )}

                {currentRoundActive && (
                  <button
                    className="primary-management-button"
                    onClick={
                      completeRound
                    }
                    disabled={
                      !canCompleteRound ||
                      roundActionLoading
                    }
                  >
                    {roundActionLoading
                      ? "Completing..."
                      : `Complete Round ${selectedRoom.currentRound}`}
                  </button>
                )}

                {allRoundsComplete &&
                  !selectedRoom.matchmakingCompleted && (
                    <button
                      className="primary-management-button"
                      onClick={
                        finalizeMatchmaking
                      }
                      disabled={
                        !canFinalize ||
                        roundActionLoading
                      }
                    >
                      {roundActionLoading
                        ? "Finalizing..."
                        : "Finalize matchmaking"}
                    </button>
                  )}

                {selectedRoom.matchmakingCompleted && (
                  <button
                    className="refresh-button"
                    onClick={() =>
                      loadMatchmaking(
                        selectedRoom.roomCode
                      )
                    }
                    disabled={
                      matchmakingLoading
                    }
                  >
                    {matchmakingLoading
                      ? "Loading..."
                      : "Refresh results"}
                  </button>
                )}
              </div>

              <div className="matchmaking-progress">
                {Array.from(
                  {
                    length:
                      selectedRoom.totalRounds
                  },
                  (_, index) => {
                    const roundNumber =
                      index + 1;

                    const round =
                      selectedRoom.rounds?.find(
                        (item) =>
                          item.roundNumber ===
                          roundNumber
                      );

                    const completed =
                      round?.status ===
                      "completed";

                    const active =
                      round?.status ===
                        "active" ||
                      round?.status ===
                        "voting";

                    return (
                      <div
                        className={
                          completed
                            ? "round-step completed"
                            : active
                            ? "round-step active"
                            : "round-step"
                        }
                        key={
                          roundNumber
                        }
                      >
                        <span>
                          {completed
                            ? "✓"
                            : roundNumber}
                        </span>

                        <strong>
                          Round{" "}
                          {roundNumber}
                        </strong>
                      </div>
                    );
                  }
                )}
              </div>

              {matchmaking && (
                <div className="matchmaking-results">
                  <div className="results-heading">
                    <div>
                      <span className="dashboard-eyebrow">
                        ADMIN ONLY
                      </span>

                      <h3>
                        Voting intelligence
                      </h3>

                      <p className="results-subtitle">
                        See exactly who selected whom in each voting round.
                      </p>
                    </div>

                    <button
                      className="refresh-button"
                      onClick={() =>
                        loadMatchmaking(
                          selectedRoom.roomCode
                        )
                      }
                      disabled={
                        matchmakingLoading
                      }
                    >
                      {matchmakingLoading
                        ? "Refreshing..."
                        : "Refresh votes"}
                    </button>
                  </div>

                  <div className="vote-round-bar">
                    <div className="vote-round-label">
                      <span>VOTING ROUND</span>

                      <strong>
                        Round{" "}
                        {selectedVoteRound}
                      </strong>
                    </div>

                    <div className="vote-round-tabs">
                      {voteRounds.length > 0 ? (
                        voteRounds.map(
                          (round) => (
                            <button
                              type="button"
                              key={round.roundNumber}
                              className={
                                selectedVoteRound ===
                                round.roundNumber
                                  ? "vote-round-tab active"
                                  : "vote-round-tab"
                              }
                              onClick={() =>
                                setSelectedVoteRound(
                                  round.roundNumber
                                )
                              }
                            >
                              <span>
                                {round.status ===
                                "completed"
                                  ? "✓"
                                  : round.status ===
                                    "voting"
                                  ? "●"
                                  : round.roundNumber}
                              </span>

                              Round{" "}
                              {round.roundNumber}
                            </button>
                          )
                        )
                      ) : (
                        <div className="vote-empty-tab">
                          Voting starts in Round 2
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedVoteRoundData ? (
                    <>
                      <div className="vote-overview">
                        <div className="vote-stat">
                          <span>SUBMISSIONS</span>
                          <strong>
                            {submittedVoteCount}
                            <small>
                              /{votingParticipantCount}
                            </small>
                          </strong>
                        </div>

                        <div className="vote-stat">
                          <span>STATUS</span>
                          <strong className="vote-status-text">
                            {selectedVoteRoundData.status ===
                            "completed"
                              ? "Complete"
                              : selectedVoteRoundData.status ===
                                "voting"
                              ? "Voting"
                              : "Waiting"}
                          </strong>
                        </div>

                        <div className="vote-stat">
                          <span>ROUND</span>
                          <strong>
                            {selectedVoteRound}
                          </strong>
                        </div>
                      </div>

                      <div className="voting-results-list">
                        {selectedRoom.participants?.map(
                          (
                            participant,
                            index
                          ) => {
                            const selection =
                              roundSelections.find(
                                (item) =>
                                  String(
                                    item.participantId
                                  ) ===
                                  String(
                                    participant._id
                                  )
                              );

                            return (
                              <div
                                className={
                                  selection
                                    ? "vote-result-row submitted"
                                    : "vote-result-row"
                                }
                                key={
                                  participant._id
                                }
                                style={{
                                  animationDelay: `${index * 35}ms`
                                }}
                              >
                                <div className="vote-person">
                                  <span className="vote-avatar">
                                    {(
                                      participant.username ||
                                      "P"
                                    )
                                      .charAt(0)
                                      .toUpperCase()}
                                  </span>

                                  <div>
                                    <strong>
                                      {participant.username ||
                                        "Participant"}
                                    </strong>

                                    <span>
                                      {selection
                                        ? "Selection submitted"
                                        : "Not voted yet"}
                                    </span>
                                  </div>
                                </div>

                                <div className="vote-arrow">
                                  →
                                </div>

                                <div className="vote-targets">
                                  {selection?.selectedParticipants
                                    ?.length ? (
                                    selection.selectedParticipants.map(
                                      (person) => (
                                        <span
                                          className="vote-target"
                                          key={
                                            person.participantId
                                          }
                                        >
                                          {person.username}
                                        </span>
                                      )
                                    )
                                  ) : (
                                    <span className="vote-no-selection">
                                      {selection
                                        ? "No people selected"
                                        : "Waiting for vote"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="vote-not-available">
                      <div>○</div>
                      <strong>
                        Voting starts from Round 2
                      </strong>
                      <span>
                        Round 1 is conversation only.
                      </span>
                    </div>
                  )}

                  {selectedRoom.matchmakingCompleted && (
                    <>
                      <div className="results-divider" />

                      <div className="results-heading">
                        <div>
                          <span className="dashboard-eyebrow">
                            FINAL RESULTS
                          </span>

                          <h3>
                            Matchmaking results
                          </h3>
                        </div>
                      </div>

                      <div className="results-grid">
                      <div className="results-card">
                        <span>
                          MUTUAL MATCHES
                        </span>

                        <strong>
                          {
                            matchmaking
                              .mutualMatches
                              ?.length ||
                            0
                          }
                        </strong>

                        {matchmaking
                          .mutualMatches
                          ?.length >
                        0 ? (
                          <div className="results-list">
                            {matchmaking.mutualMatches.map(
                              (
                                match,
                                index
                              ) => (
                                <div
                                  className="result-row"
                                  key={
                                    index
                                  }
                                >
                                  <span>
                                    {
                                      match
                                        .usernames?.[0]
                                    }
                                  </span>

                                  <strong>
                                    ↔
                                  </strong>

                                  <span>
                                    {
                                      match
                                        .usernames?.[1]
                                    }
                                  </span>
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <p>
                            No mutual
                            selections.
                          </p>
                        )}
                      </div>

                      <div className="results-card">
                        <span>
                          SELECTIONS
                        </span>

                        <strong>
                          {
                            matchmaking
                              .selections
                              ?.length ||
                            0
                          }
                        </strong>

                        <div className="results-list">
                          {matchmaking
                            .selections
                            ?.map(
                              (
                                selection,
                                index
                              ) => (
                                <div
                                  className="selection-row"
                                  key={
                                    `${selection.participantId}-${selection.roundNumber}-${index}`
                                  }
                                >
                                  <div>
                                    <strong>
                                      {
                                        selection.username
                                      }
                                    </strong>

                                    <span>
                                      Round{" "}
                                      {
                                        selection.roundNumber
                                      }
                                    </span>
                                  </div>

                                  <p>
                                    {selection
                                      .selectedParticipants
                                      ?.length
                                      ? selection.selectedParticipants
                                          .map(
                                            (
                                              person
                                            ) =>
                                              person.username
                                          )
                                          .join(
                                            ", "
                                          )
                                      : "No selections"}
                                  </p>
                                </div>
                              )
                            )}
                        </div>
                      </div>
                    </div>

                    <div className="results-card final-groups-results">
                      <span>
                        FINAL FRIENDSHIP QUEST GROUPS
                      </span>

                      <div className="final-groups-grid">
                        {matchmaking
                          .finalGroups
                          ?.map(
                            (
                              group
                            ) => (
                              <div
                                className="final-group"
                                key={
                                  group.groupNumber
                                }
                              >
                                <div>
                                  <strong>
                                    Group{" "}
                                    {
                                      group.groupNumber
                                    }
                                  </strong>

                                  <span>
                                    {
                                      group.members
                                        ?.length
                                    }{" "}
                                    / 4
                                  </span>
                                </div>

                                {group.members?.map(
                                  (
                                    member
                                  ) => (
                                    <p
                                      key={
                                        member.participantId
                                      }
                                    >
                                      {
                                        member.username
                                      }
                                    </p>
                                  )
                                )}
                              </div>
                            )
                          )}
                      </div>
                    </div>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="groups-section">
              <div className="management-section-header">
                <div>
                  <span className="dashboard-eyebrow">
                    GROUP MANAGEMENT
                  </span>

                  <h3>
                    Groups
                  </h3>
                </div>

                <button
                  className="primary-management-button"
                  onClick={() => {
                    setShowCreateGroup(
                      true
                    );
                    setGroupName("");
                    setError("");
                  }}
                >
                  + Create group
                </button>
              </div>

              {showCreateGroup && (
                <div className="create-group-card">
                  <input
                    type="text"
                    placeholder="Group name"
                    value={
                      groupName
                    }
                    onChange={(
                      event
                    ) =>
                      setGroupName(
                        event.target.value
                      )
                    }
                    onKeyDown={(
                      event
                    ) => {
                      if (
                        event.key ===
                        "Enter"
                      ) {
                        createGroup();
                      }
                    }}
                    autoFocus
                  />

                  <button
                    className="create-match-button"
                    onClick={
                      createGroup
                    }
                    disabled={
                      creatingGroup
                    }
                  >
                    {creatingGroup
                      ? "Creating..."
                      : "Create group"}
                  </button>

                  <button
                    className="cancel-button"
                    onClick={() => {
                      setShowCreateGroup(
                        false
                      );
                      setGroupName("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              )}

              {selectedRoom.groups?.length >
              0 ? (
                <div className="groups-grid">
                  {selectedRoom.groups.map(
                    (group) => (
                      <div
                        className="group-card"
                        key={
                          group._id
                        }
                      >
                        <div className="group-card-header">
                          <div>
                            <span>
                              GROUP
                            </span>

                            <h4>
                              {
                                group.name
                              }
                            </h4>
                          </div>

                          <button
                            className="group-delete"
                            disabled={
                              actionLoading
                            }
                            onClick={() =>
                              deleteGroup(
                                group._id
                              )
                            }
                          >
                            Delete
                          </button>
                        </div>

                        <div className="group-members">
                          {group.members
                            ?.length >
                          0 ? (
                            group.members.map(
                              (
                                member
                              ) => {
                                const participant =
                                  selectedRoom.participants.find(
                                    (
                                      item
                                    ) =>
                                      String(
                                        item._id
                                      ) ===
                                      String(
                                        member.participantId
                                      )
                                  );

                                return (
                                  <div
                                    className="group-member"
                                    key={`${group._id}-${member.participantId}`}
                                  >
                                    <span>
                                      {
                                        participant
                                          ?.username
                                      }
                                    </span>

                                    <button
                                      disabled={
                                        actionLoading
                                      }
                                      onClick={() =>
                                        removeUserFromGroup(
                                          group._id,
                                          member.participantId
                                        )
                                      }
                                    >
                                      Remove
                                    </button>
                                  </div>
                                );
                              }
                            )
                          ) : (
                            <p className="group-empty">
                              No users yet.
                            </p>
                          )}
                        </div>

                        <div className="group-footer">
                          <span>
                            {group.members
                              ?.length ||
                              0}{" "}
                            / 4 users
                          </span>

                          <button
                            className="add-user-button"
                            disabled={
                              actionLoading ||
                              group.members
                                ?.length >=
                                4
                            }
                            onClick={() =>
                              setSelectedGroupId(
                                selectedGroupId ===
                                  group._id
                                  ? null
                                  : group._id
                              )
                            }
                          >
                            {group.members
                              ?.length >=
                            4
                              ? "Full"
                              : "Add user"}
                          </button>
                        </div>

                        {selectedGroupId ===
                          group._id && (
                          <div className="user-picker">
                            <div className="user-picker-header">
                              <span>
                                ADD USER
                              </span>

                              <button
                                onClick={() =>
                                  setSelectedGroupId(
                                    null
                                  )
                                }
                              >
                                ×
                              </button>
                            </div>

                            {unassignedUsers.length >
                            0 ? (
                              <div className="user-picker-list">
                                {unassignedUsers.map(
                                  (
                                    participant
                                  ) => (
                                    <button
                                      key={
                                        participant._id
                                      }
                                      disabled={
                                        actionLoading
                                      }
                                      onClick={() =>
                                        addUserToGroup(
                                          group._id,
                                          participant._id
                                        )
                                      }
                                    >
                                      {
                                        participant.username
                                      }

                                      <span>
                                        +
                                      </span>
                                    </button>
                                  )
                                )}
                              </div>
                            ) : (
                              <p>
                                All users are
                                already assigned.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              ) : (
                <div className="management-empty">
                  Create your first
                  group, then add
                  registered users
                  to it.
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {confirmModal.open && (
        <div className="confirm-overlay">
          <div
            className="confirm-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
          >
            <div className="confirm-modal-icon">
              !
            </div>

            <span className="confirm-modal-eyebrow">
              CONFIRM ACTION
            </span>

            <h3 id="confirm-modal-title">
              {confirmModal.title}
            </h3>

            <p>
              {
                confirmModal.message
              }
            </p>

            <div className="confirm-modal-actions">
              <button
                type="button"
                className="confirm-cancel"
                onClick={
                  closeConfirmModal
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete"
                onClick={() => {
                  const action =
                    confirmModal.action;

                  if (action) {
                    action();
                  }
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default AdminDashboard;