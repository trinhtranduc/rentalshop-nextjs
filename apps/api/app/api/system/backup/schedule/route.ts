import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@rentalshop/database';
import {API} from '@rentalshop/constants';

interface BackupSchedule {
  id: string;
  name: string;
  type: 'full' | 'incremental' | 'schema-only';
  frequency: 'daily' | 'weekly' | 'monthly';
  time: string; // HH:MM format
  days?: number[]; // For weekly/monthly (0=Sunday, 1=Monday, etc.)
  retention: number; // Days to keep backups
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status: 'active' | 'paused' | 'error';
}

interface BackupJob {
  id: string;
  scheduleId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: string;
  completedAt?: string;
  backupId?: string;
  error?: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get all backup schedules
    const schedules = await getBackupSchedules();
    
    return NextResponse.json({
      success: true,
      schedules
    });

  } catch (error) {
    console.error('❌ Failed to get backup schedules:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get backup schedules'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const schedule: Omit<BackupSchedule, 'id' | 'lastRun' | 'nextRun' | 'status'> = body;

    // Validate schedule
    const validation = validateBackupSchedule(schedule);
    if (!validation.valid) {
      return NextResponse.json({
        success: false,
        error: validation.error
      }, { status: 400 });
    }

    // Create new schedule
    const newSchedule = await createBackupSchedule(schedule);
    
    return NextResponse.json({
      success: true,
      schedule: newSchedule
    });

  } catch (error) {
    console.error('❌ Failed to create backup schedule:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create backup schedule'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Schedule ID is required'
      }, { status: 400 });
    }

    // Validate updates
    if (updates.frequency || updates.time || updates.days) {
      const validation = validateBackupSchedule(updates);
      if (!validation.valid) {
        return NextResponse.json({
          success: false,
          error: validation.error
        }, { status: 400 });
      }
    }

    // Update schedule
    const updatedSchedule = await updateBackupSchedule(id, updates);
    
    return NextResponse.json({
      success: true,
      schedule: updatedSchedule
    });

  } catch (error) {
    console.error('❌ Failed to update backup schedule:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update backup schedule'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Schedule ID is required'
      }, { status: 400 });
    }

    // Delete schedule
    await deleteBackupSchedule(id);
    
    return NextResponse.json({
      success: true,
      message: 'Backup schedule deleted successfully'
    });

  } catch (error) {
    console.error('❌ Failed to delete backup schedule:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete backup schedule'
    }, { status: API.STATUS.INTERNAL_SERVER_ERROR });
  }
}

// Helper functions
async function getBackupSchedules(): Promise<BackupSchedule[]> {
  // In a real implementation, this would query a database table
  // For now, return mock data
  return [
    {
      id: 'daily-full-backup',
      name: 'Daily Full Backup',
      type: 'full',
      frequency: 'daily',
      time: '02:00',
      retention: 30,
      enabled: true,
      lastRun: '2024-01-15T02:00:00Z',
      nextRun: '2024-01-16T02:00:00Z',
      status: 'active'
    },
    {
      id: 'weekly-schema-backup',
      name: 'Weekly Schema Backup',
      type: 'schema-only',
      frequency: 'weekly',
      time: '03:00',
      days: [0], // Sunday
      retention: 90,
      enabled: true,
      lastRun: '2024-01-14T03:00:00Z',
      nextRun: '2024-01-21T03:00:00Z',
      status: 'active'
    }
  ];
}

async function createBackupSchedule(schedule: Omit<BackupSchedule, 'id' | 'lastRun' | 'nextRun' | 'status'>): Promise<BackupSchedule> {
  const id = `schedule-${Date.now()}`;
  const nextRun = calculateNextRun(schedule.frequency, schedule.time, schedule.days);
  
  const newSchedule: BackupSchedule = {
    id,
    ...schedule,
    lastRun: undefined,
    nextRun,
    status: 'active'
  };
  
  // In a real implementation, save to database
  console.log('📅 Created backup schedule:', newSchedule);
  
  return newSchedule;
}

async function updateBackupSchedule(id: string, updates: Partial<BackupSchedule>): Promise<BackupSchedule> {
  // In a real implementation, update in database
  const existingSchedule = await getBackupScheduleById(id);
  if (!existingSchedule) {
    throw new Error('Schedule not found');
  }
  
  const updatedSchedule = {
    ...existingSchedule,
    ...updates,
    nextRun: updates.frequency || updates.time || updates.days 
      ? calculateNextRun(updates.frequency || existingSchedule.frequency, updates.time || existingSchedule.time, updates.days || existingSchedule.days)
      : existingSchedule.nextRun
  };
  
  console.log('📅 Updated backup schedule:', updatedSchedule);
  
  return updatedSchedule;
}

async function deleteBackupSchedule(id: string): Promise<void> {
  // In a real implementation, delete from database
  console.log('📅 Deleted backup schedule:', id);
}

async function getBackupScheduleById(id: string): Promise<BackupSchedule | null> {
  const schedules = await getBackupSchedules();
  return schedules.find(s => s.id === id) || null;
}

function validateBackupSchedule(schedule: Partial<BackupSchedule>): { valid: boolean; error?: string } {
  if (schedule.frequency && !['daily', 'weekly', 'monthly'].includes(schedule.frequency)) {
    return { valid: false, error: 'Invalid frequency. Must be daily, weekly, or monthly.' };
  }
  
  if (schedule.time && !/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(schedule.time)) {
    return { valid: false, error: 'Invalid time format. Use HH:MM format.' };
  }
  
  if (schedule.type && !['full', 'incremental', 'schema-only'].includes(schedule.type)) {
    return { valid: false, error: 'Invalid backup type. Must be full, incremental, or schema-only.' };
  }
  
  if (schedule.retention && (schedule.retention < 1 || schedule.retention > 365)) {
    return { valid: false, error: 'Retention must be between 1 and 365 days.' };
  }
  
  if (schedule.days && schedule.days.some(day => day < 0 || day > 6)) {
    return { valid: false, error: 'Invalid days. Must be 0-6 (0=Sunday, 6=Saturday).' };
  }
  
  return { valid: true };
}

function calculateNextRun(frequency: string, time: string, days?: number[]): string {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  let nextRun = new Date();
  nextRun.setHours(hours, minutes, 0, 0);
  
  switch (frequency) {
    case 'daily':
      if (nextRun <= now) {
        nextRun.setDate(nextRun.getDate() + 1);
      }
      break;
      
    case 'weekly':
      if (days && days.length > 0) {
        const targetDay = days[0]; // Use first day for simplicity
        const currentDay = now.getDay();
        const daysUntilTarget = (targetDay - currentDay + 7) % 7;
        
        if (daysUntilTarget === 0 && nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 7);
        } else {
          nextRun.setDate(nextRun.getDate() + daysUntilTarget);
        }
      } else {
        nextRun.setDate(nextRun.getDate() + 7);
      }
      break;
      
    case 'monthly':
      nextRun.setMonth(nextRun.getMonth() + 1);
      break;
  }
  
  return nextRun.toISOString();
}
