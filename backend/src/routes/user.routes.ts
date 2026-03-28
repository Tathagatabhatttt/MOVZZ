import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import {
    getProfileHandler,
    updateProfileHandler,
    getFavoritesHandler,
    addFavoriteHandler,
    removeFavoriteHandler,
    getWalletHandler,
} from '../controllers/user.controller';

const router = Router();

router.use(authenticateUser);

router.get('/me', getProfileHandler);
router.put('/me', updateProfileHandler);
router.get('/me/favorites', getFavoritesHandler);
router.post('/me/favorites', addFavoriteHandler);
router.delete('/me/favorites/:id', removeFavoriteHandler);
router.get('/me/wallet', getWalletHandler);

export default router;
