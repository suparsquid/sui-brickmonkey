module brickmonkey::contract {

    use std::vector;

    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::event::{Self};
    use sui::sui::SUI;
    use sui::transfer;


    const QUEUEING: u8 = 0;
    const IN_PROGRESS: u8 = 1;
    const FINISHED: u8 = 2;

    const EInsufficientBalance: u64 = 15;
    const EWrongStatus: u64 = 16;
    const EAlreadyJoined: u64 = 17;
    const ENotOwner: u64 = 19;
    const ENoParticipants: u64 = 20;
    const ENoWinners: u64 = 21;

    struct Game has key, store {
        id: UID,
        owner: address,
        entry_fee: u64,
        status: u8, // 0 = Queueing, 1 = InProgress, 2 = Finished
        participants: vector<address>,
        winners: vector<address>,
        total_reward: Balance<SUI>,
        epoch: u64
    }

    struct PlayerJoined has copy, drop {
        player: address,
        total_reward: u64
    }

    struct GameStarted has copy, drop {
        total_reward: u64,
    }

    struct GameEnded has copy, drop {
        winners: vector<address>,
        total_reward: u64,
    }

    public entry fun create_game(entry_fee: u64, ctx: &mut TxContext) {
        let game = Game {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            entry_fee,
            status: QUEUEING,
            participants: vector[],
            winners: vector[],
            total_reward: balance::zero(),
            epoch: 1
        };
        transfer::share_object(game);
    }

    public fun join_game(game: &mut Game, entry_fee: Coin<SUI>, ctx: &mut TxContext) {
        assert!(game.status == QUEUEING, EWrongStatus);
        assert!(!vector::contains(&game.participants, &tx_context::sender(ctx)), EAlreadyJoined);
        assert!(coin::value(&entry_fee) >= game.entry_fee, EInsufficientBalance);
        
        vector::push_back(&mut game.participants, tx_context::sender(ctx));
        let entry_fee_balance = coin::into_balance(entry_fee);
        balance::join(&mut game.total_reward, entry_fee_balance);

        event::emit(PlayerJoined {
            player: tx_context::sender(ctx),
            total_reward: balance::value(&game.total_reward)
        });
    }

    public fun start_game(game: &mut Game, ctx: &mut TxContext) {
        assert!(game.status == QUEUEING, EWrongStatus);
        assert!(game.owner == tx_context::sender(ctx), ENotOwner);
        assert!(!vector::is_empty(&game.participants), ENoParticipants);

        game.status = IN_PROGRESS;

        event::emit(GameStarted {
            total_reward: balance::value(&game.total_reward)
        });
    }

    public fun end_game(game: &mut Game, winners: vector<address>, ctx: &mut TxContext) {
        assert!(game.status == IN_PROGRESS, EWrongStatus);
        assert!(game.owner == tx_context::sender(ctx), ENotOwner);
        assert!(!vector::is_empty(&winners), ENoWinners);

        game.winners = winners;
        let winner_count = vector::length(&winners);

        let total_reward_value = ((balance::value(&game.total_reward) * 9) / 10);
        let i = 0;
        while (i < winner_count) {
            let winner_address = vector::borrow(&winners, i);
            let coin = coin::take(&mut game.total_reward, (total_reward_value / winner_count), ctx);
            transfer::public_transfer(coin, *winner_address);
            i = i + 1;
        };

        game.status = FINISHED;
        event::emit(GameEnded {
            winners: game.winners,
            total_reward: balance::value(&game.total_reward)
        });
    }

    public fun reset_game(game: &mut Game, new_entry_fee: u64, payout_addr: address, ctx: &mut TxContext) {
        assert!(game.status == FINISHED, EWrongStatus);
        assert!(game.owner == tx_context::sender(ctx), ENotOwner);

        let total_reward_value = balance::value(&game.total_reward);
        let coin = coin::take(&mut game.total_reward, total_reward_value, ctx);
        transfer::public_transfer(coin, payout_addr);
        
        let epoch = game.epoch;

        let game = Game {
            id: object::new(ctx),
            owner: tx_context::sender(ctx),
            entry_fee: new_entry_fee,
            status: QUEUEING,
            participants: vector[],
            winners: vector[],
            total_reward: balance::zero(),
            epoch: epoch + 1
        };
        transfer::share_object(game);
    }

    // === Views ===

    public fun status(game: &Game): u8{ game.status }
    public fun entry_fee(game: &Game): u64{ game.entry_fee }
    public fun total_reward(game: &Game): u64{ balance::value(&game.total_reward) }
    public fun in_participants(game: &Game, player: address): bool{ vector::contains(&game.participants, &player) }
}