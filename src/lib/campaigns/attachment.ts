/**
 * Server-side helpers for campaign message attachments.
 *
 * Attachments are uploaded at compose time to the private
 * `messagerie-attachments` bucket (shared with the inbox composer — see
 * lib/messagerie/upload-attachment.ts) and referenced on
 * `campaign_jobs.metadata.attachment`. The batch worker downloads the bytes
 * here at send time and forwards them to the provider.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types/supabase';
import type { CampaignAttachment } from './types';

/** Shared with the inbox composer's private bucket. */
export const CAMPAIGN_ATTACHMENT_BUCKET = 'messagerie-attachments';

/** Campaign attachment cap. */
export const CAMPAIGN_ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;

/**
 * Download a stored campaign attachment for an outbound send. Throws on
 * failure so callers can mark the prospect as a (retryable) error rather than
 * silently sending a message that references a file that never went out.
 */
export async function downloadCampaignAttachment(
    supabase: SupabaseClient<Database>,
    attachment: CampaignAttachment
): Promise<{ blob: Blob; name: string }> {
    const { data, error } = await supabase.storage
        .from(CAMPAIGN_ATTACHMENT_BUCKET)
        .download(attachment.path);
    if (error || !data) {
        throw new Error(
            `Échec du téléchargement de la pièce jointe « ${attachment.name} »`
        );
    }
    return { blob: data, name: attachment.name };
}
