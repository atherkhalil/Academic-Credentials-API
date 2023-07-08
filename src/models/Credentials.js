import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    type: {
      enum: ["ACADEMIC", "EMPLOYMENT"],
      type: String,
      required: true,
    },

    programId: {
      type: String,
    },

    faculty: {
      type: String,
    },

    level: {
      type: String,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    creditHours: {
      type: Number,
    },
    cgpa: {
      type: String,
    },

    issuanceDate: {
      type: Date,
      required: true,
    },

    expiryDate: {
      type: Date,
      required: true,
    },

    session: {
      type: String,
    },

    credentialUrl: {
      type: String,
    },
    issuer: {
      id: {
        type: String,
      },
      type: {
        type: String,
        enum: ["ACCREDITED", "EMPLOYER", "NON-ACCREDITED"],
      },
      name: {
        type: String,
      },
      url: {
        type: String,
      },
      address: {
        country: {
          type: String,
          required: false,
        },
        city: {
          type: String,
          required: false,
        },
        street: {
          type: String,
          required: false,
        },
      },
    },

    learner: {
      id: {
        type: String,
      },
      registrationNumber: {
        type: String,
      },
      programIdRegistrationNumber: {
        type: String,
      },
      firstName: {
        type: String,
      },
      lastName: {
        type: String,
      },
    },

    moe: {
      moeId: {
        type: String,
      },
      moeName: {
        type: String,
      },
      publicKey: {
        type: String,
      },
    },

    equivalency: {
      equivalatedBy: {
        type: String,
      },
      equivalatedFor: {
        type: String,
      },
      equivalentFrom: {
        type: String,
      },
      equivalentTo: {
        type: String,
      },
      signingDate: {
        type: Date,
      },
      r: {
        type: String,
      },
      s: {
        type: String,
      },
      k: {
        type: String,
      },
    },

    revocation: {
      status: {
        type: Boolean,
      },
      signingDate: {
        type: Date,
      },
      r: {
        type: String,
      },
      s: {
        type: String,
      },
      k: {
        type: String,
      },
    },

    credentialTrackingStatus: {
      currentStatus: {
        enum: [
          "created",
          "issuerSign",
          "learnerSign",
          "moeSign",
          "attestationRequest",
        ],
        type: String,
      },
      created: {
        status: {
          type: String,
          default: "CREATED",
        },
        date: {
          type: Date,
          default: Date.now(),
        },
      },
      issuerSign: {
        status: {
          enum: ["PENDING", "SIGNED", "REJECTED"],
          type: String,
          default: "PENDING",
        },
        date: {
          type: Date,
        },
        publicKey: {
          type: String,
        },

        remarks: {
          type: String,
        },

        issuerECDSA: {
          signingDate: {
            type: Date,
          },
          r: {
            type: String,
          },
          s: {
            type: String,
          },
          // k: {
          //   type: String,
          // },
        },
      },
      learnerSign: {
        status: {
          enum: ["PENDING", "SIGNED", "REJECTED"],
          type: String,
        },
        remarks: {
          type: String,
        },
        date: {
          type: Date,
        },
        publicKey: {
          type: String,
        },
        learnerECDSA: {
          signingDate: {
            type: Date,
          },
          r: {
            type: String,
          },
          s: {
            type: String,
          },
          // k: {
          //   type: String,
          // },
        },
      },

      attestationRequest: {
        status: {
          enum: ["PENDING", "APPLIED"],
          type: String,
        },
        date: {
          type: Date,
        },
      },

      moeSign: {
        status: {
          enum: ["PENDING", "SIGNED", "REJECTED"],
          type: String,
        },
        remarks: {
          type: String,
        },
        date: {
          type: Date,
        },
        publicKey: {
          type: String,
        },
        moeECDSA: {
          signingDate: {
            type: Date,
          },
          r: {
            type: String,
          },
          s: {
            type: String,
          },
          // k: {
          //   type: String,
          // },
        },
      },

      txnId: {
        type: String,
      },
    },

    equivalency: {
      status: {
        enum: ["APPLIED", "EQUIVALATED", "REJECTED"],
        type: String,
      },
      date: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("credentials", schema);
