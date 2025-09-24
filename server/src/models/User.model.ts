import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
	username: string;
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	phone?: string;
	avatar?: string;
	role: 'store_owner' | 'admin' | 'cashier' | 'sales_rep';
	language: 'en' | 'si';
	isActive: boolean;
	lastLogin?: Date;
	refreshToken?: string | null;
	resetPasswordToken?: string;
	resetPasswordExpires?: Date;
	twoFactorEnabled?: boolean;
	permissions: string[];
	otpCode?: string;
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
	}
}, {
	timestamps: true
});

userSchema.pre('save', async function (next) {
	const user = this as IUser;
	if (!user.isModified('password')) {
		return next();
	}

	const salt = await bcrypt.genSalt(10);
	user.password = await bcrypt.hash(user.password, salt);
	return next();
});

userSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
	const user = this as IUser;
	return bcrypt.compare(candidate, user.password);
};

export const User = mongoose.model<IUser>('User', userSchema);