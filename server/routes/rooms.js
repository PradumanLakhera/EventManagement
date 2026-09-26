const express = require("express");
const Room = require("../models/Room");
const authenticateAdmin = require("../middleware/authenticateAdmin");

const router = express.Router();

const shuffle = (array) => {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
};

const generateConversationGroups = (participants, room) => {
  const shuffled = shuffle(participants);

  const groups = [];

  for (let i = 0; i < shuffled.length; i += 4) {
    groups.push({
      groupNumber: groups.length + 1,
      participants: shuffled.slice(i, i + 4).map((participant) => ({
        participantId: participant._id,
        username: participant.username,
        age: participant.age
      }))
    });
  }

  return groups;
};

const buildSelectionMap = (room) => {
  const selectionMap = new Map();

  for (const round of room.rounds) {
    for (const selection of round.selections || []) {
      const voterId = String(selection.participantId);

      if (!selectionMap.has(voterId)) {
        selectionMap.set(voterId, new Set());
      }

      for (const selectedId of selection.selectedParticipants || []) {
        selectionMap.get(voterId).add(String(selectedId));
      }
    }
  }

  return selectionMap;
};

const getMutualPairs = (room) => {
  const selectionMap = buildSelectionMap(room);
  const pairs = [];

  for (const [personA, selectedPeople] of selectionMap.entries()) {
    for (const personB of selectedPeople) {
      if (personA === personB) continue;

      const personBSelections = selectionMap.get(personB);

      if (
        personBSelections &&
        personBSelections.has(personA)
      ) {
        const exists = pairs.some(
          (pair) =>
            pair.includes(personA) &&
            pair.includes(personB)
        );

        if (!exists) {
          pairs.push([personA, personB]);
        }
      }
    }
  }

  return pairs;
};

const buildFinalGroups = (room) => {
  const participants = room.participants.map((participant) => ({
    participantId: String(participant._id),
    username: participant.username,
    age: participant.age
  }));

  const participantMap = new Map(
    participants.map((participant) => [
      participant.participantId,
      participant
    ])
  );

  const mutualPairs = getMutualPairs(room);

  const groups = [];
  const assigned = new Set();

  for (const pair of mutualPairs) {
    const available = pair.filter(
      (participantId) => !assigned.has(participantId)
    );

    if (available.length === 2) {
      groups.push({
        groupNumber: groups.length + 1,
        participants: available.map(
          (participantId) => participantMap.get(participantId)
        )
      });

      available.forEach((participantId) =>
        assigned.add(participantId)
      );
    }
  }

  const remaining = participants.filter(
    (participant) => !assigned.has(participant.participantId)
  );

  for (let i = 0; i < remaining.length; i += 4) {
    const group = remaining.slice(i, i + 4);

    groups.push({
      groupNumber: groups.length + 1,
      participants: group
    });

    group.forEach((participant) =>
      assigned.add(participant.participantId)
    );
  }

  return groups;
};

const buildAdminMatches = (room) => {
  const selectionMap = buildSelectionMap(room);
  const participants = room.participants.map((participant) => ({
    participantId: String(participant._id),
    username: participant.username,
    age: participant.age
  }));

  const participantMap = new Map(
    participants.map((participant) => [
      participant.participantId,
      participant
    ])
  );

  const matches = [];
  const processed = new Set();

  for (const [participantId, selections] of selectionMap.entries()) {
    for (const selectedId of selections) {
      if (participantId === selectedId) continue;

      const reverseSelections = selectionMap.get(selectedId);

      if (
        reverseSelections &&
        reverseSelections.has(participantId)
      ) {
        const key = [participantId, selectedId]
          .sort()
          .join("-");

        if (!processed.has(key)) {
          processed.add(key);

          matches.push({
            participant1:
              participantMap.get(participantId),
            participant2:
              participantMap.get(selectedId)
          });
        }
      }
    }
  }

  return matches;
};

router.post("/", authenticateAdmin, async (req, res) => {
  try {
    const { name, totalRounds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Room name is required."
      });
    }

    const rounds = Number(totalRounds);

    if (!rounds || rounds < 1) {
      return res.status(400).json({
        message: "Total rounds must be at least 1."
      });
    }

    const roomCode = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    const room = await Room.create({
      name: name.trim(),
      roomCode,
      totalRounds: rounds,
      currentRound: 0,
      phase: "waiting",
      participants: [],
      rounds: [],
      finalGroups: [],
      matches: [],
      matchmakingCompleted: false
    });

    return res.status(201).json({
      message: "Room created successfully.",
      room
    });
  } catch (error) {
    console.error("Create room error:", error);

    return res.status(500).json({
      message: "Server error."
    });
  }
});

router.get("/", authenticateAdmin, async (req, res) => {
  try {
    const rooms = await Room.find()
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      rooms
    });
  } catch (error) {
    console.error("Get rooms error:", error);

    return res.status(500).json({
      message: "Server error."
    });
  }
});

router.get("/:roomCode", async (req, res) => {
  try {
    const room = await Room.findOne({
      roomCode: req.params.roomCode.toUpperCase()
    }).lean();

    if (!room) {
      return res.status(404).json({
        message: "Room not found."
      });
    }

    return res.json({
      room
    });
  } catch (error) {
    console.error("Get room error:", error);

    return res.status(500).json({
      message: "Server error."
    });
  }
});

router.post("/:roomCode/register", async (req, res) => {
  try {
    const room = await Room.findOne({
      roomCode: req.params.roomCode.toUpperCase()
    });

    if (!room) {
      return res.status(404).json({
        message: "Room not found."
      });
    }

    if (room.matchmakingCompleted) {
      return res.status(400).json({
        message: "Matchmaking has already been completed."
      });
    }

    const username = req.body.username?.trim();
    const age = Number(req.body.age);

    if (!username || !age) {
      return res.status(400).json({
        message: "Username and age are required."
      });
    }

    if (age < 13) {
      return res.status(400).json({
        message: "Minimum age is 13."
      });
    }

    const duplicate = room.participants.some(
      (participant) =>
        participant.username.toLowerCase() ===
        username.toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        message: "Username is already registered."
      });
    }

    room.participants.push({
      username,
      age
    });

    await room.save();

    const participant =
      room.participants[room.participants.length - 1];

    return res.status(201).json({
      message: "Registration successful.",
      participantId: participant._id,
      username: participant.username,
      age: participant.age,
      roomCode: room.roomCode
    });
  } catch (error) {
    console.error("Participant registration error:", error);

    return res.status(500).json({
      message: "Server error."
    });
  }
});

router.get(
  "/:roomCode/participant/:participantId",
  async (req, res) => {
    try {
      const room = await Room.findOne({
        roomCode: req.params.roomCode.toUpperCase()
      }).lean();

      if (!room) {
        return res.status(404).json({
          message: "Room not found."
        });
      }

      const participant = room.participants.find(
        (item) =>
          String(item._id) ===
          String(req.params.participantId)
      );

      if (!participant) {
        return res.status(404).json({
          message: "Participant not found."
        });
      }

      const currentRound = room.rounds.find(
        (round) =>
          round.roundNumber === room.currentRound
      );

      let group = null;

      if (currentRound) {
        for (const currentGroup of currentRound.groups) {
          const found = currentGroup.participants.some(
            (item) =>
              String(item.participantId) ===
              String(participant._id)
          );

          if (found) {
            group = currentGroup;
            break;
          }
        }
      }

      let hasVoted = false;

      if (currentRound) {
        hasVoted = currentRound.selections.some(
          (selection) =>
            String(selection.participantId) ===
            String(participant._id)
        );
      }

      return res.json({
        roomCode: room.roomCode,
        participantId: participant._id,
        username: participant.username,
        age: participant.age,
        currentRound: room.currentRound,
        totalRounds: room.totalRounds,
        phase: room.phase,
        roundStatus: currentRound
          ? currentRound.status
          : null,
        hasVoted,
        group
      });
    } catch (error) {
      console.error("Participant status error:", error);

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/rounds/start",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room = await Room.findOne({
        roomCode: req.params.roomCode.toUpperCase()
      });

      if (!room) {
        return res.status(404).json({
          message: "Room not found."
        });
      }

      if (room.matchmakingCompleted) {
        return res.status(400).json({
          message: "Matchmaking has already been completed."
        });
      }

      const requestedRound = Number(
        req.body.roundNumber
      );

      const roundNumber =
        requestedRound > 0
          ? requestedRound
          : room.currentRound + 1;

      if (roundNumber > room.totalRounds) {
        return res.status(400).json({
          message: "All rounds have already been started."
        });
      }

      const existingRound = room.rounds.find(
        (round) =>
          round.roundNumber === roundNumber
      );

      if (existingRound) {
        if (
          existingRound.status === "active" ||
          existingRound.status === "voting"
        ) {
          return res.json({
            message: `Round ${roundNumber} is already active.`,
            room
          });
        }

        return res.status(400).json({
          message: "This round has already been completed."
        });
      }

      if (roundNumber > 1) {
        const previousRound = room.rounds.find(
          (round) =>
            round.roundNumber === roundNumber - 1
        );

        if (
          !previousRound ||
          (
            previousRound.status !== "completed" &&
            previousRound.status !== "voting"
          )
        ) {
          return res.status(400).json({
            message:
              "The previous round must be completed or in voting."
          });
        }

        if (previousRound.status === "voting") {
          previousRound.status = "completed";
        }
      }

      const groups = generateConversationGroups(
        room.participants,
        room
      );

      room.rounds.push({
        roundNumber,
        status: "active",
        groups,
        selections: []
      });

      room.currentRound = roundNumber;
      room.phase = "conversation";

      await room.save();

      return res.json({
        message: `Round ${roundNumber} started.`,
        room
      });
    } catch (error) {
      console.error("Start round error:", error);

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/rounds/:roundNumber/vote",
  async (req, res) => {
    try {
      const room = await Room.findOne({
        roomCode: req.params.roomCode.toUpperCase()
      });

      if (!room) {
        return res.status(404).json({
          message: "Room not found."
        });
      }

      const roundNumber = Number(
        req.params.roundNumber
      );

      const round = room.rounds.find(
        (item) =>
          item.roundNumber === roundNumber
      );

      if (!round) {
        return res.status(404).json({
          message: "Round not found."
        });
      }

      if (round.status !== "voting") {
        return res.status(400).json({
          message: "Voting is not currently open."
        });
      }

      const participantId = String(
        req.body.participantId || ""
      );

      const participant = room.participants.find(
        (item) =>
          String(item._id) === participantId
      );

      if (!participant) {
        return res.status(404).json({
          message: "Participant not found."
        });
      }

      const selectedParticipants = Array.isArray(
        req.body.selectedParticipants
      )
        ? req.body.selectedParticipants
        : [];

      const group = round.groups.find(
        (currentGroup) =>
          currentGroup.participants.some(
            (item) =>
              String(item.participantId) ===
              participantId
          )
      );

      if (!group) {
        return res.status(400).json({
          message: "Participant is not assigned to a group."
        });
      }

      const validIds = new Set(
        group.participants
          .map((item) => String(item.participantId))
          .filter((id) => id !== participantId)
      );

      const cleanSelections = [
        ...new Set(
          selectedParticipants
            .map((id) => String(id))
            .filter((id) => validIds.has(id))
        )
      ];

      const existingSelectionIndex =
        round.selections.findIndex(
          (selection) =>
            String(selection.participantId) ===
            participantId
        );

      if (existingSelectionIndex >= 0) {
        round.selections[
          existingSelectionIndex
        ].selectedParticipants = cleanSelections;
      } else {
        round.selections.push({
          participantId,
          selectedParticipants: cleanSelections
        });
      }

      room.phase = "voting";

      await room.save();

      return res.json({
        message: "Vote saved successfully.",
        selectedParticipants: cleanSelections
      });
    } catch (error) {
      console.error("Vote error:", error);

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/rounds/:roundNumber/complete",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room = await Room.findOne({
        roomCode: req.params.roomCode.toUpperCase()
      });

      if (!room) {
        return res.status(404).json({
          message: "Room not found."
        });
      }

      const roundNumber = Number(
        req.params.roundNumber
      );

      const round = room.rounds.find(
        (item) =>
          item.roundNumber === roundNumber
      );

      if (!round) {
        return res.status(404).json({
          message: "Round not found."
        });
      }

      if (round.status === "completed") {
        return res.status(400).json({
          message: "Round is already completed."
        });
      }

      if (round.status === "active") {
        round.status = "voting";
        room.phase = "voting";

        await room.save();

        return res.json({
          message:
            `Round ${roundNumber} conversation completed. Voting is now open.`,
          room
        });
      }

      if (round.status === "voting") {
        round.status = "completed";

        room.phase =
          roundNumber < room.totalRounds
            ? "conversation"
            : "completed";

        await room.save();

        return res.json({
          message: `Round ${roundNumber} completed.`,
          room
        });
      }

      return res.status(400).json({
        message: "Invalid round status."
      });
    } catch (error) {
      console.error("Complete round error:", error);

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/finalize",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room = await Room.findOne({
        roomCode: req.params.roomCode.toUpperCase()
      });

      if (!room) {
        return res.status(404).json({
          message: "Room not found."
        });
      }

      if (room.matchmakingCompleted) {
        return res.status(400).json({
          message: "Matchmaking is already completed."
        });
      }

      if (room.rounds.length !== room.totalRounds) {
        return res.status(400).json({
          message: "All rounds must be started first."
        });
      }

      const incompleteRound = room.rounds.find(
        (round) =>
          round.status !== "completed"
      );

      if (incompleteRound) {
        return res.status(400).json({
          message:
            `Round ${incompleteRound.roundNumber} must be completed first.`
        });
      }

      room.finalGroups = buildFinalGroups(room);
      room.matches = buildAdminMatches(room);
      room.matchmakingCompleted = true;
      room.phase = "completed";

      await room.save();

      return res.json({
        message: "Matchmaking completed.",
        finalGroups: room.finalGroups,
        matches: room.matches,
        room
      });
    } catch (error) {
      console.error("Finalize matchmaking error:", error);

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

module.exports = router;