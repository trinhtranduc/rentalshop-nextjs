import React from 'react';
import { FileText, AlertCircle, Info, MessageSquare } from 'lucide-react';

/** Order shape needed for notes + images (OrderWithDetails or OrderData) */
interface NotesSectionOrder {
  notes?: string;
  notesImages?: string[];
  pickupNotes?: string;
  pickupNotesImages?: string[];
  returnNotes?: string;
  returnNotesImages?: string[];
  damageNotes?: string;
  damageNotesImages?: string[];
  bailAmount?: number;
  material?: string;
  damageFee?: number;
}

interface NotesSectionProps {
  order: NotesSectionOrder;
}

const imagesToArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

const NoteCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  content: string | null | undefined;
  images?: string[];
  className?: string;
}> = ({ icon, title, content, images = [], className = '' }) => {
  const hasContent = content || images.length > 0;
  if (!hasContent) return null;

  return (
    <div className={`border border-gray-200 rounded-lg p-4 bg-gray-50 ${className}`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-700 mb-2">{title}</h4>
          {content ? (
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap mb-3">{content}</p>
          ) : null}
          {images.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {images.map((url, i) => (
                <a
                  key={`${url}-${i}`}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-16 h-16 rounded border border-gray-200 overflow-hidden bg-gray-100 hover:opacity-90"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export const NotesSection: React.FC<NotesSectionProps> = ({ order }) => {
  // Note images are shown only in OrderSettingsCard (right). Here we only show text notes to avoid duplicate.
  const hasNotes =
    order.notes ||
    order.pickupNotes ||
    order.returnNotes ||
    order.damageNotes;

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
      {/* General Notes - images only in OrderSettingsCard (right), no duplicate here */}
      <NoteCard
        icon={<FileText className="w-4 h-4 text-gray-600" />}
        title="General Notes"
        content={order.notes}
        images={[]}
      />

      {/* Pickup Notes - images disabled for now, re-enable when supporting pickupNotesImages */}
      <NoteCard
        icon={<Info className="w-4 h-4 text-gray-600" />}
        title="Pickup Notes"
        content={order.pickupNotes}
        images={[]}
      />

      {/* Return Notes - images disabled for now, re-enable when supporting returnNotesImages */}
      <NoteCard
        icon={<Info className="w-4 h-4 text-gray-600" />}
        title="Return Notes"
        content={order.returnNotes}
        images={[]}
      />

      {/* Damage Notes - images disabled for now, re-enable when supporting damageNotesImages */}
      <NoteCard
        icon={<AlertCircle className="w-4 h-4 text-gray-600" />}
        title="Damage Notes"
        content={order.damageNotes}
        images={[]}
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
