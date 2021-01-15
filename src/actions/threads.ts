// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {ThreadTypes, PostTypes, UserTypes} from 'action_types';
import {Client4} from 'client';

import ThreadConstants from 'constants/threads';

import {DispatchFunc, GetStateFunc} from 'types/actions';

import {UserThreadList} from 'types/threads';

import {logError} from './errors';
import {forceLogoutIfNecessary} from './helpers';

export function getThreads(userId: string, teamId: string, {page = 0, perPage = ThreadConstants.THREADS_CHUNK_SIZE} = {}) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        let userThreadList: undefined | UserThreadList;

        try {
            userThreadList = await Client4.getUserThreads(userId, teamId, {page, pageSize: perPage, extended: true});
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: UserTypes.RECEIVED_PROFILES_LIST,
            data: userThreadList.threads.map(({participants: users}) => users).flat(),
        });

        dispatch({
            type: PostTypes.RECEIVED_POSTS,
            data: {posts: userThreadList.threads.map(({post}) => post)},
        });

        dispatch({
            type: ThreadTypes.RECEIVED_THREADS,
            data: {
                ...userThreadList,
                threads: userThreadList.threads.map((thread) => ({...thread, is_following: true})),
                team_id: teamId,
            },
        });

        return {data: userThreadList};
    };
}

export function markAllThreadsInTeamRead(userId: string, teamId: string) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateThreadsReadForUser(userId, teamId);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: ThreadTypes.ALL_TEAM_THREADS_READ,
            data: {
                team_id: teamId,
            },
        });

        return {};
    };
}

export function updateThreadRead(userId: string, teamId: string, threadId: string, timestamp: number) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        try {
            await Client4.updateThreadReadForUser(userId, teamId, threadId, timestamp);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }

        dispatch({
            type: ThreadTypes.READ_CHANGED_THREAD,
            data: {
                id: threadId,
                team_id: teamId,
                timestamp,
            },
        });

        return {};
    };
}

export function setThreadFollow(userId: string, teamId: string, threadId: string, newState: boolean) {
    return async (dispatch: DispatchFunc, getState: GetStateFunc) => {
        dispatch({
            type: ThreadTypes.FOLLOW_CHANGED_THREAD,
            data: {
                id: threadId,
                team_id: teamId,
                following: newState,
            },
        });

        try {
            await Client4.updateThreadFollowForUser(userId, teamId, threadId, newState);
        } catch (error) {
            forceLogoutIfNecessary(error, dispatch, getState);
            dispatch(logError(error));
            return {error};
        }
        return {};
    };
}
