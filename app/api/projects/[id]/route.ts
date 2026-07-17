import { NextResponse } from 'next/server'; import { getSessionUser } from '@/lib/auth'; import { database } from '@/lib/db'; import { apiError } from '@/lib/http';
export async function DELETE(_:Request,{params}:{params:Promise<{id:string}>}){const user=await getSessionUser();if(!user)return apiError('Authentication required.',401);const {id}=await params;const rows=await database`delete from projects where id=${id} and user_id=${user.id} returning id`;return rows.length?NextResponse.json({ok:true}):apiError('Project not found.',404)}

