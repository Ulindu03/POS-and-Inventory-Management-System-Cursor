import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// User document shape used by Mongoose
export interface IUser extends Document {
	username: string;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	phone?: string;
	avatar?: string;
	// Optional face embedding vector for biometric login (stored as array of numbers)
	faceEmbedding?: number[];
	role: 'store_owner' | 'admin' | 'cashier' | 'sales_rep'; // 'admin' kept for legacy; normalized elsewhere
	language: 'en' | 'si';
	isActive: boolean;
	lastLogin?: Date;
	passwordUpdatedAt?: Date; // set when password changed to invalidate existing sessions
	refreshToken?: string | null;
	resetPasswordToken?: string; // token used in reset link
	resetPasswordExpires?: Date; // expiry for reset link
	resetOtpCode?: string; // 6-digit code for reset (step 1)
	resetOtpExpires?: Date; // expiry for reset OTP
	resetOtpAttempts?: number; // small throttle counter
	twoFactorEnabled?: boolean;
	permissions: string[];
	otpCode?: string; // login OTP code (for roles requiring OTP)
	otpExpires?: Date;
	otpAttempts?: number;
	comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
	username: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true
	},
	email: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true
	},
	password: {
		type: String,
		required: true
	},
	firstName: {
		type: String,
		required: true,
		trim: true
	},
	lastName: {
		type: String,
		required: true,
		trim: true
	},
	phone: {
		type: String,
		trim: true
	},
	avatar: {
		type: String
	},
	faceEmbedding: {
		type: [Number],
		default: undefined
	},
	role: {
		type: String,
		enum: ['store_owner', 'admin', 'cashier', 'sales_rep'],
		default: 'cashier'
	},
	language: {
		type: String,
		enum: ['en', 'si'],
		default: 'en'
	},
	isActive: {
		type: Boolean,
		default: true
	},
	lastLogin: {
		type: Date
	},
	passwordUpdatedAt: {
		type: Date
	},
	refreshToken: {
		type: String,
		default: null
	},
	twoFactorEnabled: {
		type: Boolean,
		default: false
	},
	permissions: [{
		type: String
	}],
	otpCode: {
		type: String
	},
	otpExpires: {
		type: Date
	},
	otpAttempts: {
		type: Number,
		default: 0
	},
	resetPasswordToken: {
		type: String
	},
	resetPasswordExpires: {
		type: Date
	},
	resetOtpCode: { type: String },
	resetOtpExpires: { type: Date },
	resetOtpAttempts: { type: Number, default: 0 }
}, {
	timestamps: true
});

// Hash password if it was modified before saving
userSchema.pre('save', async function (next) {
	const user = this as IUser;
	if (!user.isModified('password')) {
		return next();
	}

	const salt = await bcrypt.genSalt(10);
	user.password = await bcrypt.hash(user.password, salt);
	return next();
});

// Compare a plain password to the stored hash
userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
	const user = this as IUser;
	return bcrypt.compare(candidate, user.password);
};

export const User = mongoose.model<IUser>('User', userSchema);