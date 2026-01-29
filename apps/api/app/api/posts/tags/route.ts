import { NextRequest, NextResponse } from 'next/server';
import { withPermissions } from '@rentalshop/auth';
import { db } from '@rentalshop/database';
import { handleApiError, ResponseBuilder } from '@rentalshop/utils';
import { postTagCreateSchema } from '@rentalshop/validation';

/**
 * GET /api/posts/tags
 * List all post tags with optional search
 */
export const GET = withPermissions(['posts.view'])(async (request, { user, userScope }) => {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    let tags;
    if (search) {
      tags = await db.postTags.search(search);
    } else {
      tags = await db.postTags.findAll();
    }

    return NextResponse.json(
      ResponseBuilder.success('TAGS_FOUND', tags)
    );
  } catch (error) {
    console.error('Error fetching tags:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});

/**
 * POST /api/posts/tags
 * Create post tag
 * 
 * Authorization: ADMIN only
 */
export const POST = withPermissions(['posts.manage'])(async (request, { user, userScope }) => {
  try {
    const body = await request.json();

    const parsed = postTagCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        ResponseBuilder.validationError(parsed.error.flatten()),
        { status: 400 }
      );
    }

    const tag = await db.postTags.create(parsed.data);

    return NextResponse.json(
      ResponseBuilder.success('TAG_CREATED_SUCCESS', tag),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating tag:', error);
    const { response, statusCode } = handleApiError(error);
    return NextResponse.json(response, { status: statusCode });
  }
});
