import { prisma } from './client'
import type { Prisma } from '@prisma/client'

export interface OrderWithRelations {
  id: number
  orderNumber: string
  orderType: string
  status: string
  totalAmount: number
  depositAmount: number
  securityDeposit: number
  damageFee: number
  lateFee: number
  discountType?: string
  discountValue: number
  discountAmount: number
  pickupPlanAt?: Date
  returnPlanAt?: Date
  pickedUpAt?: Date
  returnedAt?: Date
  rentalDuration?: number
  isReadyToDeliver: boolean
  collateralType?: string
  collateralDetails?: string
  notes?: string
  pickupNotes?: string
  returnNotes?: string
  damageNotes?: string
  createdAt: Date
  updatedAt: Date
  outletId: number
  customerId?: number
  createdById: number
  // Relations
  customer?: {
    id: number
    firstName: string
    lastName: string
    phone?: string
    email?: string
    address?: string
    idNumber?: string
  }
  outlet?: {
    id: number
    name: string
    address: string
  }
  createdBy?: {
    id: number
    firstName?: string
    email: string
  }
  orderItems?: Array<{
    id: number
    quantity: number
    unitPrice: number
    totalPrice: number
    productId: number
    product?: {
      id: number
      name: string
    }
  }>
  payments?: Array<{
    id: number
    amount: number
    method: string
    status: string
    processedAt?: Date
  }>
}

const orderSelect = {
  id: true,
  orderNumber: true,
  orderType: true,
  status: true,
  totalAmount: true,
  depositAmount: true,
  securityDeposit: true,
  damageFee: true,
  lateFee: true,
  discountType: true,
  discountValue: true,
  discountAmount: true,
  pickupPlanAt: true,
  returnPlanAt: true,
  pickedUpAt: true,
  returnedAt: true,
  rentalDuration: true,
  isReadyToDeliver: true,
  collateralType: true,
  collateralDetails: true,
  notes: true,
  pickupNotes: true,
  returnNotes: true,
  damageNotes: true,
  createdAt: true,
  updatedAt: true,
  outletId: true,
  customerId: true,
  createdById: true,
} satisfies Prisma.OrderSelect

const orderInclude = {
  customer: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      address: true,
      idNumber: true,
    }
  },
  outlet: {
    select: {
      id: true,
      name: true,
      address: true,
    }
  },
  createdBy: {
    select: {
      id: true,
      firstName: true,
      email: true,
    }
  },
  orderItems: {
    select: {
      id: true,
      quantity: true,
      unitPrice: true,
      totalPrice: true,
      productId: true,
      product: {
        select: {
          id: true,
          name: true,
        }
      }
    }
  },
  payments: {
    select: {
      id: true,
      amount: true,
      method: true,
      status: true,
      processedAt: true,
    }
  }
} satisfies Prisma.OrderInclude

function transformOrder(order: any): OrderWithRelations {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    orderType: order.orderType,
    status: order.status,
    totalAmount: order.totalAmount,
    depositAmount: order.depositAmount ?? 0,
    securityDeposit: order.securityDeposit ?? 0,
    damageFee: order.damageFee ?? 0,
    lateFee: order.lateFee ?? 0,
    discountType: order.discountType || undefined,
    discountValue: order.discountValue ?? 0,
    discountAmount: order.discountAmount ?? 0,
    pickupPlanAt: order.pickupPlanAt || undefined,
    returnPlanAt: order.returnPlanAt || undefined,
    pickedUpAt: order.pickedUpAt || undefined,
    returnedAt: order.returnedAt || undefined,
    rentalDuration: order.rentalDuration || undefined,
    isReadyToDeliver: order.isReadyToDeliver ?? false,
    collateralType: order.collateralType || undefined,
    collateralDetails: order.collateralDetails || undefined,
    notes: order.notes || undefined,
    pickupNotes: order.pickupNotes || undefined,
    returnNotes: order.returnNotes || undefined,
    damageNotes: order.damageNotes || undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    outletId: order.outletId,
    customerId: order.customerId || undefined,
    createdById: order.createdById,
    // Relations
    customer: order.customer,
    outlet: order.outlet,
    createdBy: order.createdBy,
    orderItems: order.orderItems,
    payments: order.payments,
  }
}

export async function getOrderById(id: number): Promise<OrderWithRelations | null> {
  const order = await prisma.order.findUnique({
    where: { id },
    include: orderInclude,
  })

  if (!order) return null
  return transformOrder(order)
}

export async function getOrderByNumber(orderNumber: string): Promise<OrderWithRelations | null> {
  const order = await prisma.order.findUnique({
    where: { orderNumber },
    include: orderInclude,
  })

  if (!order) return null
  return transformOrder(order)
}

export async function getOrdersByOutlet(outletId: number, limit = 50, offset = 0) {
  const orders = await prisma.order.findMany({
    where: { outletId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return orders.map(transformOrder)
}

export async function getOrdersByCustomer(customerId: number, limit = 50, offset = 0) {
  const orders = await prisma.order.findMany({
    where: { customerId },
    include: orderInclude,
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  })

  return orders.map(transformOrder)
}

export async function createOrder(data: {
  orderNumber: string
  orderType: string
  status?: string
  totalAmount: number
  depositAmount?: number
  securityDeposit?: number
  damageFee?: number
  lateFee?: number
  discountType?: string
  discountValue?: number
  discountAmount?: number
  pickupPlanAt?: Date
  returnPlanAt?: Date
  rentalDuration?: number
  isReadyToDeliver?: boolean
  collateralType?: string
  collateralDetails?: string
  notes?: string
  pickupNotes?: string
  outletId: number
  customerId?: number
  createdById: number
}): Promise<OrderWithRelations> {
  const order = await prisma.order.create({
    data: {
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      status: data.status ?? 'RESERVED',
      totalAmount: data.totalAmount,
      depositAmount: data.depositAmount ?? 0,
      securityDeposit: data.securityDeposit ?? 0,
      damageFee: data.damageFee ?? 0,
      lateFee: data.lateFee ?? 0,
      discountType: data.discountType,
      discountValue: data.discountValue ?? 0,
      discountAmount: data.discountAmount ?? 0,
      pickupPlanAt: data.pickupPlanAt,
      returnPlanAt: data.returnPlanAt,
      rentalDuration: data.rentalDuration,
      isReadyToDeliver: data.isReadyToDeliver ?? false,
      collateralType: data.collateralType,
      collateralDetails: data.collateralDetails,
      notes: data.notes,
      pickupNotes: data.pickupNotes,
      outletId: data.outletId,
      customerId: data.customerId,
      createdById: data.createdById,
    },
    include: orderInclude,
  })

  return transformOrder(order)
}

export async function updateOrder(
  id: number,
  data: Partial<{
    orderType: string
    status: string
    totalAmount: number
    depositAmount: number
    securityDeposit: number
    damageFee: number
    lateFee: number
    discountType: string
    discountValue: number
    discountAmount: number
    pickupPlanAt: Date
    returnPlanAt: Date
    pickedUpAt: Date
    returnedAt: Date
    rentalDuration: number
    isReadyToDeliver: boolean
    collateralType: string
    collateralDetails: string
    notes: string
    pickupNotes: string
    returnNotes: string
    damageNotes: string
    customerId: number
  }>
): Promise<OrderWithRelations> {
  const order = await prisma.order.update({
    where: { id },
    data,
    include: orderInclude,
  })

  return transformOrder(order)
}

export async function deleteOrder(id: number): Promise<boolean> {
  try {
    await prisma.order.delete({
      where: { id },
    })
    return true
  } catch {
    return false
  }
}

export async function getOrderCount(outletId?: number, status?: string): Promise<number> {
  const where: Prisma.OrderWhereInput = {}
  if (outletId) where.outletId = outletId
  if (status) where.status = status

  return prisma.order.count({ where })
}

export async function generateOrderNumber(outletId: number): Promise<string> {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  
  const prefix = `ORD-${year}${month}${day}`
  
  const latestOrder = await prisma.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
      outletId,
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  })

  let sequence = 1
  if (latestOrder?.orderNumber) {
    const lastSequence = parseInt(latestOrder.orderNumber.split('-').pop() || '0')
    sequence = lastSequence + 1
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`
}