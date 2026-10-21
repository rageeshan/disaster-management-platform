import mongoose from 'mongoose';

const citizenSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please enter a valid email address',
      ],
    },
    nic: {
      type: String,
      required: [true, 'NIC number is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Mobile phone number is required'],
      unique: true,
      match: [/^(?:\+94|0)?7[0-9]{8}$/, 'Please enter a valid Sri Lankan phone number'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
    },
    district: {
      type: String,
      required: [true, 'District is required'],
      enum: [
        'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya',
        'Galle', 'Matara', 'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar',
        'Vavuniya', 'Mullaitivu', 'Batticaloa', 'Ampara', 'Trincomalee',
        'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
        'Moneragala', 'Ratnapura', 'Kegalle'
      ],
    },
    homeAddress: {
      type: String,
      required: [true, 'Home address is required'],
    },
    userType: {
      type: String,
      enum: ['CITIZEN', 'COMMUNITY_VOLUNTEER'],
      default: 'CITIZEN',
    },
    role: {
      type: String,
      enum: ['CITIZEN', 'DMC_OFFICER', 'BROADCAST_OFFICER'],
      default: 'CITIZEN',
    },
  },
  { timestamps: true }
);

export default mongoose.model('Citizen', citizenSchema);