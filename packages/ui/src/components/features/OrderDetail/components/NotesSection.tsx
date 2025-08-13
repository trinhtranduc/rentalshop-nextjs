import React from 'react';
import { FileText, AlertCircle, Info, MessageSquare } from 'lucide-react';
import { OrderData } from '../types';

interface NotesSectionProps {
  order: OrderData;
}

const NoteCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  content: string | null | undefined;
  className?: string;
}> = ({ icon, title, content, className = '' }) => {
  if (!content) return null;

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
          <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    </div>
  );
};

export const NotesSection: React.FC<NotesSectionProps> = ({ order }) => {
  const hasNotes = order.notes || order.pickupNotes || order.returnNotes || order.damageNotes;

  if (!hasNotes) {
    return (
      <div className="text-center py-6 text-gray-500">
        <MessageSquare className="w-8 h-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No notes or additional information available</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* General Notes */}
      <NoteCard
        icon={<FileText className="w-4 h-4 text-gray-600" />}
        title="General Notes"
        content={order.notes}
      />

      {/* Pickup Notes */}
      <NoteCard
        icon={<Info className="w-4 h-4 text-gray-600" />}
        title="Pickup Notes"
        content={order.pickupNotes}
      />

      {/* Return Notes */}
      <NoteCard
        icon={<Info className="w-4 h-4 text-gray-600" />}
        title="Return Notes"
        content={order.returnNotes}
      />

      {/* Damage Notes */}
      <NoteCard
        icon={<AlertCircle className="w-4 h-4 text-gray-600" />}
        title="Damage Notes"
        content={order.damageNotes}
      />

      {/* Additional Information */}
      {(order.bailAmount || order.material || order.damageFee) && (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <h4 className="font-medium text-gray-700 mb-3 flex items-center">
            <Info className="w-4 h-4 text-gray-600 mr-2" />
            Additional Details
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {order.bailAmount && order.bailAmount > 0 && (
              <div className="text-center p-3 bg-white rounded border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Bail Amount</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${order.bailAmount.toFixed(2)}
                </p>
              </div>
            )}
            
            {order.material && (
              <div className="text-center p-3 bg-white rounded border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Material</p>
                <p className="text-sm font-semibold text-gray-900">
                  {order.material}
                </p>
              </div>
            )}
            
            {order.damageFee && order.damageFee > 0 && (
              <div className="text-center p-3 bg-white rounded border border-gray-200">
                <p className="text-xs text-gray-600 font-medium">Damage Fee</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${order.damageFee.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
