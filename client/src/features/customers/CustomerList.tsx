
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type Customer } from '@/lib/api/customers.api';

interface CustomerListProps {
	customers: Customer[];
	onAddCustomer: () => void;
	onEditCustomer: (customer: Customer) => void;
	onViewCustomer: (customer: Customer) => void;
	onDeleteCustomer?: (customer: Customer) => void;
	isLoading?: boolean;
	tableView?: boolean;
}

const getTypeColor = (type?: string) => {
	switch (type) {
		case 'corporate':
			return 'bg-blue-500/20 text-blue-400';
		case 'retail':
			return 'bg-green-500/20 text-green-400';
		default:
			return 'bg-gray-500/20 text-gray-400';
	}
};

const getStatusBadge = (isActive?: boolean) =>
	isActive
		? <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">Active</span>
		: <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-500/20 text-red-400">Inactive</span>;

export const CustomerList: React.FC<CustomerListProps> = ({
	customers,
	onAddCustomer,
	onEditCustomer,
	onViewCustomer,
	onDeleteCustomer,
	isLoading,
	tableView = false,
}) => {
	if (isLoading) {
		return (
			<div className="flex justify-center items-center h-40">
				<span className="text-gray-400">Loading customers...</span>
			</div>
		);
	}

	if (!customers || customers.length === 0) {
		   return (
			   <div className="flex flex-col items-center justify-center py-16 bg-red-100 border-2 border-red-400 rounded-xl">
				   <span className="text-red-700 font-bold text-lg mb-4">No customers found (debug: customers array is empty).</span>
				   <button
					   onClick={onAddCustomer}
					   className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
				   >
					   Add Customer
				   </button>
			   </div>
		   );
	}

	// Card grid view
	return (
		<div className="bg-[#242424] rounded-2xl border border-[#353945] p-6">
			   <div className="flex justify-between items-center mb-6">
				<h2 className="text-xl font-bold text-white">Customer List</h2>
				<button
					onClick={onAddCustomer}
					className="px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
				>
					Add Customer
				</button>
			</div>
			<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
				<AnimatePresence>
					{customers.map((customer) => (
						<motion.div
							key={customer._id}
							initial={{ opacity: 0, y: 30 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 30 }}
							transition={{ duration: 0.4 }}
							className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur rounded-2xl border border-white/10 shadow-lg p-6 flex flex-col gap-3 group hover:shadow-2xl hover:border-blue-400/30 transition-all"
						>
							<div className="flex items-center gap-3 mb-2">
								<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg uppercase bg-blue-500/20 text-blue-400`}>
									{customer.name?.charAt(0) || '?'}
								</div>
								<div>
									<div className="font-semibold text-white text-base flex items-center">
										{customer.name}
										{getStatusBadge(customer.isActive)}
									</div>
									<div className="text-xs text-gray-400">{customer.customerCode}</div>
								</div>
							</div>
							<div className="flex flex-col gap-1 text-sm text-gray-300">
								<div><span className="font-medium text-gray-400">Email:</span> {customer.email || <span className="text-gray-500">-</span>}</div>
								<div><span className="font-medium text-gray-400">Phone:</span> {customer.phone || <span className="text-gray-500">-</span>}</div>
								<div>
									<span className="font-medium text-gray-400">Type:</span>
									<span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${getTypeColor(customer.type)}`}>{customer.type || 'N/A'}</span>
								</div>
								<div>
									<span className="font-medium text-gray-400">Credit:</span>
									<span className="ml-2 text-white font-semibold">{customer.creditLimit?.toLocaleString() || 0} LKR</span>
								</div>
								<div>
									<span className="font-medium text-gray-400">Loyalty:</span>
									<span className="ml-2 text-yellow-300 font-semibold">{customer.loyaltyPoints?.toLocaleString() || 0} pts</span>
								</div>
							</div>
							<div className="flex gap-2 mt-4 justify-start flex-wrap">
								<button
									onClick={() => onViewCustomer(customer)}
									className="inline-flex w-auto px-4 py-1.5 rounded-lg bg-white/10 text-blue-400 font-semibold hover:bg-blue-500/20 hover:text-blue-300 transition shrink-0"
								>
									View
								</button>
								<button
									onClick={() => onEditCustomer(customer)}
									className="inline-flex w-auto px-4 py-1.5 rounded-lg bg-white/10 text-green-400 font-semibold hover:bg-green-500/20 hover:text-green-300 transition shrink-0"
								>
									Edit
								</button>
								{onDeleteCustomer && (
									<button
										onClick={() => onDeleteCustomer(customer)}
										className="inline-flex w-auto px-4 py-1.5 rounded-lg bg-white/10 text-red-400 font-semibold hover:bg-red-500/20 hover:text-red-300 transition shrink-0"
									>
										Delete
									</button>
								)}
							</div>
						</motion.div>
					))}
				</AnimatePresence>
			</div>
		</div>
	);
};
