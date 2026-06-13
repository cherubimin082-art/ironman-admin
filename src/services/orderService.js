export const DUMMY_ORDERS = [
  { id: "ORD-001", customer: "Anitha S.",    items: "2 shirts, 1 saree",  status: "pending",    amount: 120, zone: "Anna Nagar",   time: "10:00 AM" },
  { id: "ORD-002", customer: "Karthik R.",   items: "3 trousers",         status: "in-progress", amount: 90,  zone: "T. Nagar",    time: "10:30 AM" },
  { id: "ORD-003", customer: "Priya M.",     items: "1 kurta, 2 shirts",  status: "ready",      amount: 75,  zone: "Adyar",       time: "11:00 AM" },
  { id: "ORD-004", customer: "Suresh P.",    items: "4 shirts",           status: "delivered",  amount: 160, zone: "Velachery",   time: "11:30 AM" },
  { id: "ORD-005", customer: "Meena J.",     items: "1 saree, 1 blouse",  status: "pending",    amount: 60,  zone: "Porur",       time: "12:00 PM" },
  { id: "ORD-006", customer: "Deepak V.",    items: "2 trousers, 1 coat", status: "in-progress", amount: 200, zone: "Guindy",     time: "12:30 PM" },
];

export const DUMMY_PICKUP_JOBS = [
  { id: "PU-001", vendor: "Murugan Irons", address: "12, Anna Nagar East", orders: 3, distance: "2.1 km", time: "11:00 AM", status: "available" },
  { id: "PU-002", vendor: "Sri Irons",     address: "45, T. Nagar",        orders: 2, distance: "3.5 km", time: "11:45 AM", status: "available" },
  { id: "PU-003", vendor: "Raja Press",    address: "78, Adyar",           orders: 5, distance: "5.0 km", time: "12:30 PM", status: "taken" },
];

export const DUMMY_VENDORS = [
  { id: 1, name: "Murugan Irons",  phone: "9876543210", zone: "Anna Nagar", status: "active",   orders: 42, rating: 4.8 },
  { id: 2, name: "Sri Irons",      phone: "9811112222", zone: "T. Nagar",   status: "active",   orders: 35, rating: 4.6 },
  { id: 3, name: "Raja Press",     phone: "9833334444", zone: "Adyar",      status: "inactive", orders: 18, rating: 4.2 },
  { id: 4, name: "Velmurugan Co.", phone: "9855556666", zone: "Guindy",     status: "active",   orders: 29, rating: 4.5 },
];

export const DUMMY_DELIVERY_PARTNERS = [
  { id: 1, name: "Ravi Kumar",   phone: "9123456789", zone: "Anna Nagar", status: "active",   deliveries: 87, rating: 4.9 },
  { id: 2, name: "Senthil R.",   phone: "9199887766", zone: "T. Nagar",   status: "active",   deliveries: 63, rating: 4.7 },
  { id: 3, name: "Manoj D.",     phone: "9177665544", zone: "Adyar",      status: "on-leave", deliveries: 45, rating: 4.4 },
];

export const REVENUE_DATA = [
  { month: "Jan", revenue: 12000, orders: 95  },
  { month: "Feb", revenue: 15000, orders: 120 },
  { month: "Mar", revenue: 13500, orders: 108 },
  { month: "Apr", revenue: 17000, orders: 140 },
  { month: "May", revenue: 19500, orders: 162 },
  { month: "Jun", revenue: 22000, orders: 185 },
];

export function getOrdersByVendor() {
  return DUMMY_ORDERS;
}

export function getPickupJobs() {
  return DUMMY_PICKUP_JOBS;
}
