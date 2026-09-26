const mongoose = require("mongoose");

const participantSchema =
  new mongoose.Schema(
    {
      _id: {
        type: String,
        required: true
      },

      username: {
        type: String,
        required: true,
        trim: true
      }
    },
    {
      _id: false
    }
  );

const groupMemberSchema =
  new mongoose.Schema(
    {
      participantId: {
        type: String,
        required: true
      },

      username: {
        type: String,
        default: ""
      }
    },
    {
      _id: false
    }
  );

const manualGroupSchema =
  new mongoose.Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true
      },

      members: {
        type: [groupMemberSchema],
        default: []
      }
    },
    {
      timestamps: true
    }
  );

const conversationMemberSchema =
  new mongoose.Schema(
    {
      participantId: {
        type: String,
        required: true
      },

      username: {
        type: String,
        default: ""
      }
    },
    {
      _id: false
    }
  );

const conversationGroupSchema =
  new mongoose.Schema(
    {
      groupNumber: {
        type: Number,
        required: true
      },

      members: {
        type: [conversationMemberSchema],
        default: []
      }
    },
    {
      _id: false
    }
  );

const selectionSchema =
  new mongoose.Schema(
    {
      participantId: {
        type: String,
        required: true
      },

      selectedParticipants: {
        type: [String],
        default: []
      }
    },
    {
      _id: false
    }
  );

const roundSchema =
  new mongoose.Schema(
    {
      roundNumber: {
        type: Number,
        required: true
      },

      status: {
        type: String,
        enum: [
          "pending",
          "active",
          "voting",
          "completed"
        ],
        default: "pending"
      },

      groups: {
        type: [conversationGroupSchema],
        default: []
      },

      selections: {
        type: [selectionSchema],
        default: []
      }
    },
    {
      _id: false
    }
  );

const finalGroupMemberSchema =
  new mongoose.Schema(
    {
      participantId: {
        type: String,
        required: true
      },

      username: {
        type: String,
        default: ""
      }
    },
    {
      _id: false
    }
  );

const finalGroupSchema =
  new mongoose.Schema(
    {
      groupNumber: {
        type: Number,
        required: true
      },

      members: {
        type: [finalGroupMemberSchema],
        default: []
      }
    },
    {
      _id: false
    }
  );

const matchSchema =
  new mongoose.Schema(
    {
      participantA: {
        type: String,
        required: true
      },

      participantB: {
        type: String,
        required: true
      },

      usernameA: {
        type: String,
        default: ""
      },

      usernameB: {
        type: String,
        default: ""
      }
    },
    {
      timestamps: true
    }
  );

const roomSchema =
  new mongoose.Schema(
    {
      roomCode: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
      },

      name: {
        type: String,
        required: true,
        trim: true
      },

      participants: {
        type: [participantSchema],
        default: []
      },

      groups: {
        type: [manualGroupSchema],
        default: []
      },

      matches: {
        type: [matchSchema],
        default: []
      },

      totalRounds: {
        type: Number,
        default: 3,
        min: 1
      },

      currentRound: {
        type: Number,
        default: 0,
        min: 0
      },

      phase: {
        type: String,
        enum: [
          "registration",
          "conversation",
          "completed"
        ],
        default: "registration"
      },

      rounds: {
        type: [roundSchema],
        default: []
      },

      finalGroups: {
        type: [finalGroupSchema],
        default: []
      },

      matchmakingCompleted: {
        type: Boolean,
        default: false
      },

      active: {
        type: Boolean,
        default: true
      }
    },
    {
      timestamps: true
    }
  );

module.exports =
  mongoose.model(
    "Room",
    roomSchema
  );