import { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../../../src/lib/singletons/prisma';
import { requireAuth } from '../../../../src/lib/auth/session';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id: workflowId } = req.query;
  const method = req.method;

  // Authenticate user
  const user = await requireAuth(req, res);
  if (!user) return;

  // Get the workflow
  const workflow = await prisma.workflow.findUnique({
    where: { id: workflowId as string },
  });
  if (!workflow) {
    return res.status(404).json({ success: false, error: 'Workflow not found' });
  }

  // Only owner can manage shares
  if (workflow.userId !== user.id) {
    return res.status(403).json({ success: false, error: 'Only the workflow owner can manage shares' });
  }

  switch (method) {
    case 'GET': {
      // List shares
      const shares = await prisma.workflowShare.findMany({
        where: { workflowId: workflowId as string },
        include: { user: true },
      });
      return res.status(200).json({
        success: true,
        shares: shares.map(s => ({
          id: s.id,
          email: s.user.email,
          userId: s.userId,
          permission: s.permission,
        })),
      });
    }
    case 'POST': {
      // Add a share
      const { email, permission } = req.body;
      if (!email || !permission) {
        return res.status(400).json({ success: false, error: 'Email and permission are required' });
      }
      const shareUser = await prisma.user.findUnique({ where: { email } });
      if (!shareUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      if (shareUser.id === user.id) {
        return res.status(400).json({ success: false, error: 'Cannot share workflow with yourself' });
      }
      const existing = await prisma.workflowShare.findUnique({
        where: { workflowId_userId: { workflowId: workflowId as string, userId: shareUser.id } },
      });
      if (existing) {
        return res.status(409).json({ success: false, error: 'Workflow already shared with this user' });
      }
      const newShare = await prisma.workflowShare.create({
        data: {
          workflowId: workflowId as string,
          userId: shareUser.id,
          permission,
        },
      });
      return res.status(201).json({ success: true, share: { id: newShare.id, userId: shareUser.id, email: shareUser.email, permission: newShare.permission } });
    }
    case 'PATCH': {
      // Update permission
      const { email, permission } = req.body;
      if (!email || !permission) {
        return res.status(400).json({ success: false, error: 'Email and permission are required' });
      }
      const shareUser = await prisma.user.findUnique({ where: { email } });
      if (!shareUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const share = await prisma.workflowShare.findUnique({
        where: { workflowId_userId: { workflowId: workflowId as string, userId: shareUser.id } },
      });
      if (!share) {
        return res.status(404).json({ success: false, error: 'Share not found' });
      }
      const updated = await prisma.workflowShare.update({
        where: { workflowId_userId: { workflowId: workflowId as string, userId: shareUser.id } },
        data: { permission },
      });
      return res.status(200).json({ success: true, share: { id: updated.id, userId: shareUser.id, email: shareUser.email, permission: updated.permission } });
    }
    case 'DELETE': {
      // Remove share
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
      }
      const shareUser = await prisma.user.findUnique({ where: { email } });
      if (!shareUser) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }
      const share = await prisma.workflowShare.findUnique({
        where: { workflowId_userId: { workflowId: workflowId as string, userId: shareUser.id } },
      });
      if (!share) {
        return res.status(404).json({ success: false, error: 'Share not found' });
      }
      await prisma.workflowShare.delete({
        where: { workflowId_userId: { workflowId: workflowId as string, userId: shareUser.id } },
      });
      return res.status(200).json({ success: true });
    }
    default:
      return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
} 