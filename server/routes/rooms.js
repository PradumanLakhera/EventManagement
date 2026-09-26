const express = require("express");
const crypto = require("crypto");

const Room = require("../models/room");
const authenticateAdmin = require("../middleware/auth");

const router = express.Router();

const generateRoomCode = () => {
  return crypto
    .randomBytes(4)
    .toString("hex")
    .toUpperCase()
    .slice(0, 8);
};

const generateParticipantId = () => {
  return crypto
    .randomBytes(12)
    .toString("hex");
};

const shuffle = (array) => {
  const result = [...array];

  for (
    let i = result.length - 1;
    i > 0;
    i--
  ) {
    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [
      result[i],
      result[j]
    ] = [
      result[j],
      result[i]
    ];
  }

  return result;
};

const getParticipant = (
  room,
  participantId
) => {
  return (
    room.participants.find(
      (participant) =>
        String(participant._id) ===
        String(participantId)
    ) || null
  );
};

const normalizeGroupMembers = (
  room
) => {
  if (!Array.isArray(room.groups)) {
    return;
  }

  for (const group of room.groups) {
    if (!Array.isArray(group.members)) {
      continue;
    }

    for (const member of group.members) {
      const participant =
        getParticipant(
          room,
          member.participantId
        );

      if (participant) {
        member.username =
          participant.username;
      } else if (
        typeof member.username !==
        "string"
      ) {
        member.username = "";
      }
    }
  }
};

const getPreviousPairs = (room) => {
  const pairs = new Set();

  for (const round of room.rounds || []) {
    for (const group of round.groups || []) {
      const ids =
        group.members.map(
          (member) =>
            String(
              member.participantId
            )
        );

      for (
        let i = 0;
        i < ids.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < ids.length;
          j++
        ) {
          const pair = [
            ids[i],
            ids[j]
          ].sort();

          pairs.add(
            `${pair[0]}:${pair[1]}`
          );
        }
      }
    }
  }

  return pairs;
};

const generateConversationGroups = (
  participants,
  room
) => {
  if (!participants.length) {
    return [];
  }

  const previousPairs =
    getPreviousPairs(room);

  let bestGroups = [];
  let bestScore = Infinity;

  for (
    let attempt = 0;
    attempt < 100;
    attempt++
  ) {
    const shuffled =
      shuffle(participants);

    const groups = [];

    for (
      let i = 0;
      i < shuffled.length;
      i += 4
    ) {
      const members =
        shuffled.slice(i, i + 4);

      groups.push({
        groupNumber:
          groups.length + 1,
        members:
          members.map(
            (participant) => ({
              participantId:
                String(
                  participant._id
                ),
              username:
                participant.username
            })
          )
      });
    }

    let score = 0;

    for (const group of groups) {
      const ids =
        group.members.map(
          (member) =>
            member.participantId
        );

      for (
        let i = 0;
        i < ids.length;
        i++
      ) {
        for (
          let j = i + 1;
          j < ids.length;
          j++
        ) {
          const pair = [
            ids[i],
            ids[j]
          ].sort();

          if (
            previousPairs.has(
              `${pair[0]}:${pair[1]}`
            )
          ) {
            score++;
          }
        }
      }
    }

    if (score < bestScore) {
      bestScore = score;
      bestGroups = groups;
    }

    if (score === 0) {
      break;
    }
  }

  return bestGroups;
};

const buildSelectionMap = (
  room
) => {
  const selections = {};

  for (const participant of room.participants) {
    selections[
      String(participant._id)
    ] = new Set();
  }

  for (const round of room.rounds || []) {
    for (
      const selection of
      round.selections || []
    ) {
      const voterId =
        String(
          selection.participantId
        );

      if (!selections[voterId]) {
        selections[voterId] =
          new Set();
      }

      for (
        const selectedId of
        selection.selectedParticipants ||
        []
      ) {
        const targetId =
          String(selectedId);

        if (
          targetId !== voterId &&
          room.participants.some(
            (participant) =>
              String(
                participant._id
              ) === targetId
          )
        ) {
          selections[
            voterId
          ].add(targetId);
        }
      }
    }
  }

  return selections;
};

const getMutualPairs = (room) => {
  const selections =
    buildSelectionMap(room);

  const participantIds =
    room.participants.map(
      (participant) =>
        String(participant._id)
    );

  const pairs = [];
  const seen = new Set();

  for (const personA of participantIds) {
    for (const personB of participantIds) {
      if (personA === personB) {
        continue;
      }

      const key = [
        personA,
        personB
      ]
        .sort()
        .join(":");

      if (seen.has(key)) {
        continue;
      }

      if (
        selections[personA]?.has(
          personB
        ) &&
        selections[personB]?.has(
          personA
        )
      ) {
        seen.add(key);

        pairs.push({
          a: personA,
          b: personB
        });
      }
    }
  }

  return pairs;
};

const buildFinalGroups = (
  room
) => {
  const participants =
    room.participants || [];

  const participantIds =
    participants.map(
      (participant) =>
        String(participant._id)
    );

  const selections =
    buildSelectionMap(room);

  const mutualPairs =
    getMutualPairs(room);

  const groups = [];
  const assigned = new Set();

  const createGroup = () => {
    const group = {
      groupNumber:
        groups.length + 1,
      members: []
    };

    groups.push(group);

    return group;
  };

  const addParticipant = (
    group,
    participantId
  ) => {
    if (
      group.members.length >= 4 ||
      assigned.has(participantId)
    ) {
      return false;
    }

    const participant =
      participants.find(
        (item) =>
          String(item._id) ===
          String(participantId)
      );

    if (!participant) {
      return false;
    }

    group.members.push({
      participantId,
      username:
        participant.username
    });

    assigned.add(participantId);

    return true;
  };

  for (const pair of mutualPairs) {
    if (
      assigned.has(pair.a) ||
      assigned.has(pair.b)
    ) {
      continue;
    }

    let group = groups.find(
      (item) =>
        item.members.length < 4
    );

    if (!group) {
      group = createGroup();
    }

    addParticipant(
      group,
      pair.a
    );

    addParticipant(
      group,
      pair.b
    );
  }

  const remaining =
    participantIds.filter(
      (id) =>
        !assigned.has(id)
    );

  for (const participantId of remaining) {
    let bestGroup = null;
    let bestScore = -Infinity;

    for (const group of groups) {
      if (
        group.members.length >= 4
      ) {
        continue;
      }

      let score = 0;

      for (const member of group.members) {
        const memberId =
          String(
            member.participantId
          );

        if (
          selections[
            participantId
          ]?.has(memberId)
        ) {
          score += 2;
        }

        if (
          selections[
            memberId
          ]?.has(participantId)
        ) {
          score += 2;
        }
      }

      if (
        score > bestScore
      ) {
        bestScore = score;
        bestGroup = group;
      }
    }

    if (!bestGroup) {
      bestGroup =
        createGroup();
    }

    addParticipant(
      bestGroup,
      participantId
    );
  }

  return groups;
};

const buildAdminMatches = (
  room
) => {
  const mutualPairs =
    getMutualPairs(room);

  return mutualPairs.map(
    (pair) => {
      const first =
        getParticipant(
          room,
          pair.a
        );

      const second =
        getParticipant(
          room,
          pair.b
        );

      return {
        participantA: pair.a,
        participantB: pair.b,
        usernameA:
          first?.username || "",
        usernameB:
          second?.username || ""
      };
    }
  );
};

router.get(
  "/",
  authenticateAdmin,
  async (req, res) => {
    try {
      const rooms =
        await Room.find({
          active: true
        }).sort({
          createdAt: -1
        });

      return res.json({
        rooms
      });
    } catch (error) {
      console.error(
        "Get rooms error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/",
  authenticateAdmin,
  async (req, res) => {
    try {
      const name =
        typeof req.body.name ===
        "string"
          ? req.body.name.trim()
          : "";

      const totalRounds =
        Number(
          req.body.totalRounds
        ) > 0
          ? Number(
              req.body.totalRounds
            )
          : 3;

      if (!name) {
        return res.status(400).json({
          message:
            "Room name is required."
        });
      }

      let roomCode;

      do {
        roomCode =
          generateRoomCode();
      } while (
        await Room.exists({
          roomCode
        })
      );

      const room =
        await Room.create({
          roomCode,
          name,
          totalRounds,
          currentRound: 0,
          phase: "registration",
          participants: [],
          groups: [],
          rounds: [],
          finalGroups: [],
          matchmakingCompleted:
            false,
          matches: [],
          active: true
        });

      return res.status(201).json({
        message:
          "Room created successfully.",
        room
      });
    } catch (error) {
      console.error(
        "Create room error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.get(
  "/:roomCode/participants",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode,
          active: true
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      normalizeGroupMembers(
        room
      );

      return res.json({
        room
      });
    } catch (error) {
      console.error(
        "Get participants error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.get(
  "/:roomCode",
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode,
          active: true
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      return res.json({
        room
      });
    } catch (error) {
      console.error(
        "Get room error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/join",
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode,
          active: true
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      if (
        room.phase !==
        "registration"
      ) {
        return res.status(400).json({
          message:
            "Registration is closed."
        });
      }

      const username =
        typeof req.body.username ===
        "string"
          ? req.body.username.trim()
          : "";

      if (!username) {
        return res.status(400).json({
          message:
            "Username is required."
        });
      }

      const duplicate =
        room.participants.some(
          (participant) =>
            participant.username
              .trim()
              .toLowerCase() ===
            username.toLowerCase()
        );

      if (duplicate) {
        return res.status(409).json({
          message:
            "That username is already registered."
        });
      }

      const participantId =
        generateParticipantId();

      room.participants.push({
        _id: participantId,
        username
      });

      await room.save();

      return res.status(201).json({
        message:
          "Participant registered.",
        participantId,
        username,
        roomCode:
          room.roomCode,
        roomName:
          room.name
      });
    } catch (error) {
      console.error(
        "Join room error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/groups",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const name =
        typeof req.body.name ===
        "string"
          ? req.body.name.trim()
          : "";

      if (!name) {
        return res.status(400).json({
          message:
            "Group name is required."
        });
      }

      if (!room.groups) {
        room.groups = [];
      }

      room.groups.push({
        name,
        members: []
      });

      normalizeGroupMembers(
        room
      );

      await room.save();

      return res.status(201).json({
        message:
          "Group created successfully.",
        room
      });
    } catch (error) {
      console.error(
        "Create group error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/groups/:groupId/members",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const group =
        room.groups.id(
          req.params.groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found."
        });
      }

      if (
        group.members.length >= 4
      ) {
        return res.status(400).json({
          message:
            "A group cannot contain more than 4 participants."
        });
      }

      const participantId =
        String(
          req.body.participantId ||
            ""
        );

      if (!participantId) {
        return res.status(400).json({
          message:
            "Participant ID is required."
        });
      }

      const participant =
        getParticipant(
          room,
          participantId
        );

      if (!participant) {
        return res.status(404).json({
          message:
            "Participant not found."
        });
      }

      const alreadyInGroup =
        room.groups.some(
          (currentGroup) =>
            currentGroup.members.some(
              (member) =>
                String(
                  member.participantId
                ) === participantId
            )
        );

      if (alreadyInGroup) {
        return res.status(400).json({
          message:
            "Participant is already assigned to a group."
        });
      }

      group.members.push({
        participantId,
        username:
          participant.username
      });

      normalizeGroupMembers(
        room
      );

      await room.save();

      return res.json({
        message:
          "Participant added to group.",
        room
      });
    } catch (error) {
      console.error(
        "Add participant error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.delete(
  "/:roomCode/groups/:groupId/members/:participantId",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const group =
        room.groups.id(
          req.params.groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found."
        });
      }

      const memberIndex =
        group.members.findIndex(
          (member) =>
            String(
              member.participantId
            ) ===
            String(
              req.params.participantId
            )
        );

      if (memberIndex === -1) {
        return res.status(404).json({
          message:
            "Participant is not in this group."
        });
      }

      group.members.splice(
        memberIndex,
        1
      );

      normalizeGroupMembers(
        room
      );

      await room.save();

      return res.json({
        message:
          "Participant removed from group.",
        room
      });
    } catch (error) {
      console.error(
        "Remove participant error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.delete(
  "/:roomCode/groups/:groupId",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const group =
        room.groups.id(
          req.params.groupId
        );

      if (!group) {
        return res.status(404).json({
          message:
            "Group not found."
        });
      }

      group.deleteOne();

      normalizeGroupMembers(
        room
      );

      await room.save();

      return res.json({
        message:
          "Group deleted successfully.",
        room
      });
    } catch (error) {
      console.error(
        "Delete group error:",
        error
      );

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
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      if (
        room.matchmakingCompleted
      ) {
        return res.status(400).json({
          message:
            "Matchmaking has already been completed."
        });
      }

      if (
        room.participants.length <
        2
      ) {
        return res.status(400).json({
          message:
            "At least two participants are required."
        });
      }

      const requestedRound =
        Number(
          req.body.roundNumber
        );

      const roundNumber =
        requestedRound > 0
          ? requestedRound
          : room.currentRound + 1;

      if (
        roundNumber >
        room.totalRounds
      ) {
        return res.status(400).json({
          message:
            "All conversation rounds are already complete."
        });
      }

      const previousRound =
        room.rounds.find(
          (round) =>
            round.roundNumber ===
            roundNumber - 1
        );

      if (
        roundNumber > 1 &&
        (
          !previousRound ||
          previousRound.status !==
            "completed"
        )
      ) {
        return res.status(400).json({
          message:
            "The previous conversation round must be completed first."
        });
      }

      const existingRound =
        room.rounds.find(
          (round) =>
            round.roundNumber ===
            roundNumber
        );

      if (existingRound) {
        if (
          existingRound.status ===
            "active" ||
          existingRound.status ===
            "voting"
        ) {
          return res.json({
            message:
              `Round ${roundNumber} is already active.`,
            room
          });
        }

        return res.status(400).json({
          message:
            "This round has already been completed."
        });
      }

      const groups =
        generateConversationGroups(
          room.participants,
          room
        );

      room.rounds.push({
        roundNumber,
        status: "active",
        groups,
        selections: []
      });

      room.currentRound =
        roundNumber;

      room.phase =
        "conversation";

      await room.save();

      return res.json({
        message:
          `Round ${roundNumber} started.`,
        room
      });
    } catch (error) {
      console.error(
        "Start round error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.get(
  "/:roomCode/participant/:participantId",
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode,
          active: true
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const participant =
        getParticipant(
          room,
          req.params.participantId
        );

      if (!participant) {
        return res.status(404).json({
          message:
            "Participant not found."
        });
      }

      const currentRound =
        room.rounds.find(
          (round) =>
            round.roundNumber ===
            room.currentRound
        );

      let conversationGroup =
        null;

      let hasVoted = false;

      if (currentRound) {
        conversationGroup =
          currentRound.groups.find(
            (group) =>
              group.members.some(
                (member) =>
                  String(
                    member.participantId
                  ) ===
                  String(
                    participant._id
                  )
              )
          );

        hasVoted =
          currentRound.selections.some(
            (selection) =>
              String(
                selection.participantId
              ) ===
              String(
                participant._id
              )
          );
      }

      return res.json({
        roomCode:
          room.roomCode,

        roomName:
          room.name,

        participantId:
          String(
            participant._id
          ),

        username:
          participant.username,

        currentRound:
          room.currentRound,

        totalRounds:
          room.totalRounds,

        phase:
          room.phase,

        roundStatus:
          currentRound?.status ||
          null,

        hasVoted,

        conversationGroup:
          conversationGroup
            ? {
                groupNumber:
                  conversationGroup.groupNumber,

                members:
                  conversationGroup.members
              }
            : null,

        matchmakingCompleted:
          room.matchmakingCompleted
      });
    } catch (error) {
      console.error(
        "Participant status error:",
        error
      );

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
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode,
          active: true
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const roundNumber =
        Number(
          req.params.roundNumber
        );

      if (roundNumber < 2) {
        return res.status(400).json({
          message:
            "Voting starts from Round 2."
        });
      }

      const round =
        room.rounds.find(
          (item) =>
            item.roundNumber ===
            roundNumber
        );

      if (!round) {
        return res.status(404).json({
          message:
            "Round not found."
        });
      }

      if (
        round.status !==
          "active" &&
        round.status !==
          "voting"
      ) {
        return res.status(400).json({
          message:
            "Voting is not open for this round."
        });
      }

      const participantId =
        String(
          req.body.participantId ||
            ""
        );

      const participant =
        getParticipant(
          room,
          participantId
        );

      if (!participant) {
        return res.status(404).json({
          message:
            "Participant not found."
        });
      }

      const group =
        round.groups.find(
          (item) =>
            item.members.some(
              (member) =>
                String(
                  member.participantId
                ) ===
                participantId
            )
        );

      if (!group) {
        return res.status(400).json({
          message:
            "Participant is not assigned to a conversation group."
        });
      }

      const allowedIds =
        group.members
          .map(
            (member) =>
              String(
                member.participantId
              )
          )
          .filter(
            (id) =>
              id !== participantId
          );

      const requested =
        Array.isArray(
          req.body.selectedParticipants
        )
          ? req.body
              .selectedParticipants
          : [];

      const selectedParticipants =
        [
          ...new Set(
            requested
              .map((id) =>
                String(id)
              )
              .filter((id) =>
                allowedIds.includes(id)
              )
          )
        ];

      const existing =
        round.selections.find(
          (selection) =>
            String(
              selection.participantId
            ) ===
            participantId
        );

      if (existing) {
        existing.selectedParticipants =
          selectedParticipants;
      } else {
        round.selections.push({
          participantId,
          selectedParticipants
        });
      }

      round.status =
        "voting";

      await room.save();

      return res.json({
        message:
          "Selection saved privately.",
        hasVoted: true
      });
    } catch (error) {
      console.error(
        "Vote error:",
        error
      );

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
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const roundNumber =
        Number(
          req.params.roundNumber
        );

      const round =
        room.rounds.find(
          (item) =>
            item.roundNumber ===
            roundNumber
        );

      if (!round) {
        return res.status(404).json({
          message:
            "Round not found."
        });
      }

      if (
        round.status ===
        "completed"
      ) {
        return res.json({
          message:
            `Round ${roundNumber} is already complete.`,
          room
        });
      }

      if (
        roundNumber >= 2
      ) {
        const votedIds =
          new Set(
            round.selections.map(
              (selection) =>
                String(
                  selection.participantId
                )
            )
          );

        const missingVotes =
          room.participants.filter(
            (participant) =>
              !votedIds.has(
                String(
                  participant._id
                )
              )
          );

        if (
          missingVotes.length > 0
        ) {
          return res.status(400).json({
            message:
              `${missingVotes.length} participant(s) have not submitted their selections yet.`
          });
        }
      }

      round.status =
        "completed";

      if (
        roundNumber <
        room.totalRounds
      ) {
        room.phase =
          "conversation";
      } else {
        room.phase =
          "completed";
      }

      await room.save();

      return res.json({
        message:
          `Round ${roundNumber} completed.`,
        room
      });
    } catch (error) {
      console.error(
        "Complete round error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.post(
  "/:roomCode/matchmaking/finalize",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      if (
        room.matchmakingCompleted
      ) {
        return res.status(400).json({
          message:
            "Matchmaking has already been completed."
        });
      }

      if (
        room.rounds.length !==
        room.totalRounds
      ) {
        return res.status(400).json({
          message:
            "All conversation rounds must be completed first."
        });
      }

      const incompleteRound =
        room.rounds.find(
          (round) =>
            round.status !==
            "completed"
        );

      if (incompleteRound) {
        return res.status(400).json({
          message:
            `Round ${incompleteRound.roundNumber} has not been completed.`
        });
      }

      room.finalGroups =
        buildFinalGroups(room);

      room.matches =
        buildAdminMatches(room);

      room.matchmakingCompleted =
        true;

      room.phase =
        "completed";

      await room.save();

      return res.json({
        message:
          "Matchmaking completed.",
        finalGroups:
          room.finalGroups,
        matches:
          room.matches
      });
    } catch (error) {
      console.error(
        "Finalize matchmaking error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.get(
  "/:roomCode/matchmaking",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOne({
          roomCode:
            req.params.roomCode
        });

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      const selections = [];

      for (
        const round of
        room.rounds || []
      ) {
        for (
          const selection of
          round.selections || []
        ) {
          const participant =
            getParticipant(
              room,
              selection.participantId
            );

          const selected =
            (
              selection.selectedParticipants ||
              []
            ).map(
              (selectedId) => {
                const selectedParticipant =
                  getParticipant(
                    room,
                    selectedId
                  );

                return {
                  participantId:
                    String(
                      selectedId
                    ),
                  username:
                    selectedParticipant
                      ?.username ||
                    "Unknown"
                };
              }
            );

          selections.push({
            roundNumber:
              round.roundNumber,

            participantId:
              String(
                selection.participantId
              ),

            username:
              participant?.username ||
              "Unknown",

            selectedParticipants:
              selected
          });
        }
      }

      const mutualMatches =
        getMutualPairs(room).map(
          (pair) => {
            const first =
              getParticipant(
                room,
                pair.a
              );

            const second =
              getParticipant(
                room,
                pair.b
              );

            return {
              participants: [
                pair.a,
                pair.b
              ],

              usernames: [
                first?.username ||
                  "Unknown",
                second?.username ||
                  "Unknown"
              ]
            };
          }
        );

      return res.json({
        roomCode:
          room.roomCode,

        matchmakingCompleted:
          room.matchmakingCompleted,

        selections,

        mutualMatches,

        finalGroups:
          room.finalGroups || [],

        matches:
          room.matches || []
      });
    } catch (error) {
      console.error(
        "Get matchmaking error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

router.delete(
  "/:roomCode",
  authenticateAdmin,
  async (req, res) => {
    try {
      const room =
        await Room.findOneAndUpdate(
          {
            roomCode:
              req.params.roomCode
          },
          {
            active: false
          },
          {
            new: true
          }
        );

      if (!room) {
        return res.status(404).json({
          message:
            "Room not found."
        });
      }

      return res.json({
        message:
          "Room deleted successfully.",
        room
      });
    } catch (error) {
      console.error(
        "Delete room error:",
        error
      );

      return res.status(500).json({
        message: "Server error."
      });
    }
  }
);

module.exports = router;