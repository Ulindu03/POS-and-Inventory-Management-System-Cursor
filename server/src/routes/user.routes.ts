import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { listUsers, createUser, updateUser, setUserActive, setUserRole, deleteUser } from '../controllers/user.controller';
import { cache } from '../middleware/cache.middleware';

const router = Router();

router.use(authenticate);

router.get('/', authorize('store_owner'), cache(30), listUsers);
router.post('/', authorize('store_owner'), createUser);
router.put('/:id', authorize('store_owner'), updateUser);
router.patch('/:id/active', authorize('store_owner'), setUserActive);
router.patch('/:id/role', authorize('store_owner'), setUserRole);
router.delete('/:id', authorize('store_owner'), deleteUser);

export default router;
