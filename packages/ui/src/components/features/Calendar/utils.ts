import { CalendarDay, PickupOrder } from './types';

/**
 * Generate calendar days for a given month and year
 */
export function generateCalendarDays(
  month: number, 
  year: number, 
  pickupOrders: PickupOrder[]
): CalendarDay[] {
  const days: CalendarDay[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());
  
  const endDate = new Date(lastDay);
  endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const dayOrders = pickupOrders.filter(order => {
      const orderPickupDate = new Date(order.pickupPlanAt);
      const orderReturnDate = new Date(order.returnPlanAt);
      
      return (
        (orderPickupDate.getDate() === currentDate.getDate() &&
         orderPickupDate.getMonth() === currentDate.getMonth() &&
         orderPickupDate.getFullYear() === currentDate.getFullYear()) ||
        (orderReturnDate.getDate() === currentDate.getDate() &&
         orderReturnDate.getMonth() === currentDate.getMonth() &&
         orderReturnDate.getFullYear() === currentDate.getFullYear())
      );
    });
    
    const pickupCount = pickupOrders.filter(order => {
      const orderPickupDate = new Date(order.pickupPlanAt);
      return (
        orderPickupDate.getDate() === currentDate.getDate() &&
        orderPickupDate.getMonth() === currentDate.getMonth() &&
        orderPickupDate.getFullYear() === currentDate.getFullYear()
      );
    }).length;
    
    const returnCount = pickupOrders.filter(order => {
      const orderReturnDate = new Date(order.returnPlanAt);
      return (
        orderReturnDate.getDate() === currentDate.getDate() &&
        orderReturnDate.getMonth() === currentDate.getMonth() &&
        orderReturnDate.getFullYear() === currentDate.getFullYear()
      );
    }).length;
    
    days.push({
      date: new Date(currentDate),
      day: currentDate.getDate(),
      isCurrentMonth: currentDate.getMonth() === month,
      isToday: currentDate.toDateString() === new Date().toDateString(),
      pickupCount,
      returnCount,
      orders: dayOrders
    });
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return days;
}

/**
 * Get month name from month number
 */
export function getMonthName(month: number): string {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return monthNames[month];
}

/**
 * Calculate total pickups for a month
 */
export function calculateTotalPickups(pickupOrders: PickupOrder[], month: number, year: number): number {
  return pickupOrders.filter(order => {
    const orderDate = new Date(order.pickupPlanAt);
    return orderDate.getMonth() === month && orderDate.getFullYear() === year;
  }).length;
}

/**
 * Filter orders by status and outlet
 */
export function filterPickupOrders(
  orders: PickupOrder[], 
  status: string, 
  outlet: string
): PickupOrder[] {
  return orders.filter(order => {
    const statusMatch = status === 'all' || order.status === status;
    const outletMatch = outlet === 'all' || order.outlet.name === outlet;
    return statusMatch && outletMatch;
  });
}
