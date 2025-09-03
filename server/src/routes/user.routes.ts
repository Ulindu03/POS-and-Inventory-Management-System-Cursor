import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listUsers, createUser, updateUser, setUserActive, setUserRole, deleteUser } from '../controllers/user.controller';
import { cache } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('admin'), cache(30), listUsers);
router.post('/', authorize('admin'), createUser);
router.put('/:id', authorize('admin'), updateUser);
router.patch('/:id/active', authorize('admin'), setUserActive);
router.patch('/:id/role', authorize('admin'), setUserRole);
router.delete('/:id', authorize('admin'), deleteUser);

export default router;
