"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const axios_1 = require("axios");
dotenv.config();
const API_KEY = process.env.API_KEY;
/* API Data */
/* 클라이언트에서 사용자 소환사명과 포지션을 request로 받은 경우 */
class SummonerController {
}
SummonerController.summonerInfo = (req, res) => {
    const summonerName = encodeURI(req.body.summonerName);
    return axios_1.default
        .get(`https://kr.api.riotgames.com/lol/summoner/v4/summoners/by-name/${summonerName}?api_key=${API_KEY}`)
        .then((response) => {
        res.status(200).json({
            id: response.data.id,
            accountId: response.data.accountId,
            puuid: response.data.puuid,
            name: response.data.name,
        });
    })
        .catch((err) => res.status(404).send("Summoner Not Found"));
};
SummonerController.summonerLeagueInfo = (req, res) => {
    const encryptedSummonerId = req.body.id;
    return axios_1.default
        .get(`https://kr.api.riotgames.com/lol/league/v4/entries/by-summoner/${encryptedSummonerId}?api_key=${API_KEY}`)
        .then((response) => {
        console.log(response.data);
        if (!response.data[0] ||
            response.data[0].wins + response.data[0].losses < 20) {
            res.status(400).send("Not enough Data to analyze");
        }
        else {
            res.status(200).json(response.data);
        }
    });
};
SummonerController.summonerLaneInfo = (req, res) => {
    const encryptedAccountId = req.body.accountId;
    return axios_1.default
        .get(`https://kr.api.riotgames.com/lol/match/v4/matchlists/by-account/${encryptedAccountId}?queue=420&api_key=${API_KEY}`)
        .then((response) => {
        const matchList = response.data.matches;
        let laneCount = {
            TOP: 0,
            JUNGLE: 0,
            MID: 0,
            AD_CARRY: 0,
            SUPPORT: 0,
        };
        for (let i = 0; i < matchList.length; i++) {
            if (matchList[i].lane === "TOP") {
                laneCount.TOP += 1;
            }
            else if (matchList[i].lane === "JUNGLE") {
                laneCount.JUNGLE += 1;
            }
            else if (matchList[i].lane === "MID") {
                laneCount.MID += 1;
            }
            else if (matchList[i].lane === "BOTTOM") {
                laneCount.AD_CARRY += 1;
            }
            else if (matchList[i].lane === "NONE") {
                laneCount.SUPPORT += 1;
            }
        }
        res.status(200).json(laneCount);
    });
};
/* 최근 플레이한 챔피언의  */
SummonerController.summonerMatchList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const encryptedAccountId = req.body.accountId;
    axios_1.default
        .get(`https://kr.api.riotgames.com/lol/match/v4/matchlists/by-account/${encryptedAccountId}?queue=420&api_key=${API_KEY}`)
        .then((response) => response.data);
});
SummonerController.summonerRecentChampions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    /* getMatches로  */
    try {
        const accountId = req.body.accountId;
        const summonerName = req.body.name;
        const enCodedSummonerName = encodeURI(summonerName);
        const getChampionStats = ({ gameId, champion }) => __awaiter(void 0, void 0, void 0, function* () {
            const summonerPlayInfo = yield axios_1.default
                .get(`https://kr.api.riotgames.com/lol/match/v4/matches/${gameId}?api_key=${API_KEY}`)
                .then((response) => response.data)
                .then((matchInfo) => matchInfo.participants)
                .then((matchPlayerInfo) => matchPlayerInfo.filter((player) => {
                return player.championId === champion;
            }));
            let result = {
                gameId: gameId,
                champion: summonerPlayInfo[0].championId,
                stats: {
                    participantId: summonerPlayInfo[0].stats.participantId,
                    win: summonerPlayInfo[0].stats.win,
                    kills: summonerPlayInfo[0].stats.kills,
                    deaths: summonerPlayInfo[0].stats.deaths,
                    assists: summonerPlayInfo[0].stats.assists,
                    lane: summonerPlayInfo[0].timeline.lane,
                },
            };
            return result;
        });
        const getMatchIDChampion = yield axios_1.default
            .get(`https://kr.api.riotgames.com/lol/match/v4/matchlists/by-account/${accountId}?endIndex=20&api_key=${API_KEY}&summonerName=${enCodedSummonerName}`)
            .then((response) => response.data.matches)
            .then((matches) => {
            let matchList = [];
            matches.map((match) => {
                matchList.push({ gameId: match.gameId, champion: match.champion });
            });
            return matchList;
        })
            .then((matchList) => __awaiter(void 0, void 0, void 0, function* () {
            // console.log("matchList", matchList);
            let resultArray = [];
            const callback = () => __awaiter(void 0, void 0, void 0, function* () {
                for (let el of matchList) {
                    yield getChampionStats(el).then((result) => resultArray.push(result));
                }
                return resultArray;
            });
            return callback();
        }));
        res.status(200).json(getMatchIDChampion);
    }
    catch (err) {
        console.log(err);
    }
});
/* *
 * 15분까지의 타임라인 데이터
 *  req.body의 summonerParticipantId 를 기준으로
 * participantFrames에서 participantId:summonerParticipantId인 객체 map
 * events 배열에서는 type이  "CHAMPION_KILL",  "ELITE_MONSTER_KILL" 인 객체만 map
 */
SummonerController.eventTimeline = (req, res) => {
    try {
        const matchListArray = req.body;
        let eventDataArray = [];
        const getMatchTimeline = (el) => __awaiter(void 0, void 0, void 0, function* () {
            const gameId = el.gameId;
            const summonerParticipantId = el.stats.participantId;
            const variable = yield axios_1.default
                .get(`https://kr.api.riotgames.com/lol/match/v4/timelines/by-match/${gameId}?api_key=${API_KEY}`)
                .then((response) => {
                const arr = response.data.frames;
                return arr.filter((el) => {
                    return el.timestamp !== 0 && el.timestamp < 910000;
                });
            })
                .then((output) => {
                let eventTimeline = output.map((el) => {
                    return el.events;
                });
                return eventTimeline;
            })
                .then((output) => {
                let eventArray = [];
                for (let el of output) {
                    for (let ele of el) {
                        eventArray.push(ele);
                    }
                }
                return eventArray;
            })
                .then((result) => {
                return result.filter((el) => {
                    return (el.type === "CHAMPION_KILL" || el.type === "ELITE_MONSTER_KILL");
                });
            })
                .then((result) => {
                const callback = () => {
                    let summonerEventInfo = {
                        matchKills: 0,
                        matchAssists: 0,
                        matchDeaths: 0,
                        matchDragonKills: 0,
                        matchHeraldKills: 0,
                        matchKillForLevel3: 0,
                        matchAssistForLevel3: 0,
                        matchDeathForLevel3: 0,
                        matchKillForLevel2: 0,
                        matchAssistForLevel2: 0,
                        matchDeathForLevel2: 0,
                    };
                    for (let el of result) {
                        if (el.type === "CHAMPION_KILL") {
                            if (el.killerId === summonerParticipantId) {
                                if (el.timestamp > 140000 && el.timestamp < 170000) {
                                    summonerEventInfo.matchKillForLevel2 += 1;
                                    summonerEventInfo.matchKills += 1;
                                }
                                else if (el.timestamp > 200000 && el.timestamp < 240000) {
                                    summonerEventInfo.matchKillForLevel3 += 1;
                                    summonerEventInfo.matchKills += 1;
                                }
                                else {
                                    summonerEventInfo.matchKills += 1;
                                }
                            }
                            else if (el.victimId === summonerParticipantId) {
                                if (el.timestamp > 140000 && el.timestamp < 170000) {
                                    summonerEventInfo.matchDeathForLevel2 += 1;
                                    summonerEventInfo.matchDeaths += 1;
                                }
                                else if (el.timestamp > 200000 && el.timestamp < 240000) {
                                    summonerEventInfo.matchDeathForLevel3 += 1;
                                    summonerEventInfo.matchDeaths += 1;
                                }
                                else {
                                    summonerEventInfo.matchDeaths += 1;
                                }
                            }
                            else if (el.assistingParticipantIds.includes(summonerParticipantId)) {
                                if (el.timestamp > 200000 && el.timestamp < 240000) {
                                    summonerEventInfo.matchAssistForLevel3 += 1;
                                    summonerEventInfo.matchAssists += 1;
                                }
                                else {
                                    summonerEventInfo.matchAssists += 1;
                                }
                            }
                        }
                        else if (el.type === "ELITE_MONSTER_KILL") {
                            if (el.killerId === summonerParticipantId) {
                                if (el.monsterType === "DRAGON") {
                                    summonerEventInfo.matchDragonKills += 1;
                                }
                                else if (el.monsterType === "RIFTHERALD") {
                                    summonerEventInfo.matchHeraldKills += 1;
                                }
                            }
                        }
                    }
                    // console.log(summonerEventInfo);
                    return summonerEventInfo;
                };
                const temp = callback();
                return temp;
            });
            eventDataArray.push(variable);
        });
        const callback = (array) => {
            for (let el of array) {
                getMatchTimeline(el);
                // eventDataArray.push(result);
            }
            setTimeout(() => {
                res.status(200).send(eventDataArray);
            }, 3000);
        };
        callback(matchListArray);
    }
    catch (err) {
        console.log(err);
        res.status(404).send("nope");
    }
};
/* 15분 골드 획득량 타임라인 */
SummonerController.goldTimeline = (req, res) => {
    try {
    }
    catch (err) {
        console.log(err);
    }
};
/* 15분 정글경험치 획득량 타임라인 */
SummonerController.jungleExpTimeline = (req, res) => {
    try {
    }
    catch (err) {
        console.log(err);
    }
};
exports.default = SummonerController;
//# sourceMappingURL=SummonerController.js.map