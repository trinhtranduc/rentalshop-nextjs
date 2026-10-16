import LocalizedPost, { generateMetadata as postMetadata } from '../../[tenantKey]/(public-content)/post/[slug]/page';

type Props = { params: { slug: string } };
export function generateMetadata({ params }: Props) {
  return postMetadata({ params: { ...params, tenantKey: 'vi' } });
}
export default function VietnamesePost({ params }: Props) {
  return LocalizedPost({ params: { ...params, tenantKey: 'vi' } });
}
