// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import "@uniswap/v3-periphery/contracts/libraries/TransferHelper.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";

/**
 * @title AdapterContract
 * @dev This contract serves as an adapter to interact with Uniswap V3 periphery contracts.
 */
contract AdapterContract {
    ISwapRouter public immutable swapRouter;  // Uniswap V3 Swap Router contract instance
    INonfungiblePositionManager public immutable positionManager; // Uniswap V3 Position Manager contract instance


    int24 public constant MIN_TICK = -885000; // Minimum tick value for Uniswap V3 pool
    int24 public constant MAX_TICK = 885000; // Maximum tick value for Uniswap V3 pool
    uint24 public constant FEE = 500; // Default fee for Uniswap V3 pools

    /**
     * @dev Struct to hold deposit information.
     */
    struct Deposit {
        address owner;
        uint128 liquidity;
        address token0;
        address token1;
    }

    mapping(uint256 => Deposit) public deposits; // Mapping of deposit IDs to Deposit structs

    /**
     * @dev Error to indicate the caller is not the owner of the specified token.
     */
    error NotAnOwner(uint256 tokenId);

    /**
     * @dev Emitted when a new Uniswap V3 pool is created and initialized.
     * @param pool Address of the newly created pool
     * @param token0 Address of the first token in the pool
     * @param token1 Address of the second token in the pool
     * @param fee Fee applied to the pool
     */
    event PoolCreated(
        address indexed pool,
        address token0,
        address token1,
        uint24 fee
    );

    /**
     * @dev Emitted when new positions are minted in a Uniswap V3 pool.
     * @param tokenId ID of the newly minted position
     * @param owner Address of the position owner
     * @param liquidity Amount of liquidity minted
     * @param amount0 Amount of token0 minted
     * @param amount1 Amount of token1 minted
     */
    event PositionMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @dev Emitted when fees are collected from a Uniswap V3 position.
     * @param tokenId ID of the position from which fees are collected
     * @param owner Address of the position owner
     * @param amount0 Amount of token0 collected as fees
     * @param amount1 Amount of token1 collected as fees
     */
    event FeesCollected(
        uint256 indexed tokenId,
        address indexed owner,
        uint256 amount0,
        uint256 amount1
    );

     /**
     * @dev Emitted when liquidity is decreased in a Uniswap V3 position.
     * @param tokenId ID of the position where liquidity is decreased
     * @param owner Address of the position owner
     * @param liquidity Amount of liquidity decreased
     * @param amount0 Amount of token0 received
     * @param amount1 Amount of token1 received
     */
    event LiquidityDecreased(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @dev Emitted when liquidity is increased in a Uniswap V3 position.
     * @param tokenId ID of the position where liquidity is increased
     * @param owner Address of the position owner
     * @param liquidity Amount of liquidity increased
     * @param amount0 Amount of token0 added
     * @param amount1 Amount of token1 added
     */
    event LiquidityIncreased(
        uint256 indexed tokenId,
        address indexed owner,
        uint128 liquidity,
        uint256 amount0,
        uint256 amount1
    );

    /**
     * @dev Emitted when an exact input swap is performed.
     * @param tokenIn Address of the input token
     * @param amountIn Amount of input tokens
     * @param amountOut Amount of output tokens received
     */
    event SwapExactInput(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @dev Emitted when an exact output swap is performed.
     * @param tokenIn Address of the input token
     * @param amountIn Amount of input tokens spent
     * @param amountOut Amount of output tokens received
     */
    event SwapExactOutput(
        address indexed tokenIn,
        uint256 amountIn,
        uint256 amountOut
    );

    /**
     * @dev Initializes the AdapterContract with Uniswap V3 Position Manager and Swap Router contracts.
     * @param _positionManager Address of the Uniswap V3 Position Manager contract
     * @param _swapRouter Address of the Uniswap V3 Swap Router contract
     */
    constructor(address _positionManager, address _swapRouter) {
        positionManager = INonfungiblePositionManager(_positionManager);
        swapRouter = ISwapRouter(_swapRouter);
    }

    /**
     * @dev Creates a new Uniswap V3 pool and initializes it if necessary.
     * @param token0 Address of token0
     * @param token1 Address of token1
     * @param sqrtPriceX96 Square root price of the pool
     * @return pair Address of the newly created Uniswap V3 pool
     */
    function createPool(address token0, address token1, uint160 sqrtPriceX96) external returns (address pair) {
        if (token0 > token1) (token0, token1) = (token1, token0);
        pair = positionManager.createAndInitializePoolIfNecessary(//something here
            token0,
            token1,
            FEE,
            sqrtPriceX96
        ); 
        emit PoolCreated(pair, token0, token1, FEE);

        return pair;
    }

    /**
     * @dev Mints new positions in a Uniswap V3 pool.
     * @param token0 Address of token0
     * @param token1 Address of token1
     * @param poolFee Fee of the pool
     * @param amount0ToMint Amount of token0 to mint
     * @param amount1ToMint Amount of token1 to mint
     * @return tokenId ID of the newly minted position
     * @return liquidity Amount of liquidity minted
     * @return amount0 Amount of token0 minted
     * @return amount1 Amount of token1 minted
     */
    function mintNewPositions(
        address token0,
        address token1,
        uint24 poolFee,
        uint256 amount0ToMint,
        uint256 amount1ToMint
    )
        external
        returns (
            uint256 tokenId,
            uint128 liquidity,
            uint256 amount0,
            uint256 amount1
        )
    {
        if (token0 > token1) (token0, token1) = (token1, token0);

        TransferHelper.safeTransferFrom(
            token0,
            msg.sender,
            address(this),
            amount0ToMint
        );

        TransferHelper.safeTransferFrom(
            token1,
            msg.sender,
            address(this),
            amount1ToMint
        );

        TransferHelper.safeApprove(
            token0,
            address(positionManager),
            amount0ToMint
        );
        TransferHelper.safeApprove(
            token1,
            address(positionManager),
            amount1ToMint
        );

        (tokenId, liquidity, amount0, amount1) = positionManager.mint(
            INonfungiblePositionManager.MintParams({
                token0: token0,
                token1: token1,
                fee: poolFee,
                tickLower: MIN_TICK,
                tickUpper: MAX_TICK,
                amount0Desired: amount0ToMint,
                amount1Desired: amount1ToMint,
                amount0Min: 0,
                amount1Min: 0,
                recipient: address(this),
                deadline: block.timestamp
            })
        );
        deposits[tokenId] = Deposit({
            owner: msg.sender,
            liquidity: liquidity,
            token0: token0,
            token1: token1
        });

        if (amount0 < amount0ToMint) {
            TransferHelper.safeApprove(token0, address(positionManager), 0);
            TransferHelper.safeTransfer(
                token0,
                msg.sender,
                (amount0ToMint - amount0)
            );
        }

        if (amount1 < amount1ToMint) {
            TransferHelper.safeApprove(token1, address(positionManager), 0);
            TransferHelper.safeTransfer(
                token1,
                msg.sender,
                (amount1ToMint - amount1)
            );
        }
        emit PositionMinted(tokenId, msg.sender, liquidity, amount0, amount1);

        return (tokenId, liquidity, amount0, amount1);
    }

    /**
     * @dev Collects fees from a Uniswap V3 position.
     * @param tokenId ID of the position
     * @return amount0 Amount of token0 collected as fees
     * @return amount1 Amount of token1 collected as fees
     */
    function collectAllFees(
        uint256 tokenId
    ) external returns (uint256 amount0, uint256 amount1) {
        Deposit memory position = deposits[tokenId];
        if (msg.sender != position.owner) revert NotAnOwner({tokenId: tokenId});
        (amount0, amount1) = positionManager.collect(
            INonfungiblePositionManager.CollectParams({
                tokenId: tokenId,
                recipient: msg.sender,
                amount0Max: type(uint128).max,
                amount1Max: type(uint128).max
            })
        );
        emit FeesCollected(tokenId, msg.sender, amount0, amount1);

        return (amount0, amount1);
    }

    /**
     * @dev Decreases liquidity in a Uniswap V3 position.
     * @param tokenId ID of the position
     * @param liquidity Amount of liquidity to decrease
     * @return amount0 Amount of token0 received
     * @return amount1 Amount of token1 received
     */
    function decreaseLiquidity(
        uint256 tokenId,
        uint128 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        Deposit memory position = deposits[tokenId];
        if (msg.sender != position.owner) revert NotAnOwner({tokenId: tokenId});
        (amount0, amount1) = positionManager.decreaseLiquidity(
            INonfungiblePositionManager.DecreaseLiquidityParams({
                tokenId: tokenId,
                liquidity: liquidity,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
        uint128 newLiquidity = deposits[tokenId].liquidity -= liquidity;

        emit LiquidityDecreased(
            tokenId,
            msg.sender,
            newLiquidity,
            amount0,
            amount1
        );

        return (amount0, amount1);
    }

    /**
     * @dev Increases liquidity in a Uniswap V3 position.
     * @param tokenId ID of the position
     * @param amountAdd0 Amount of token0 to add
     * @param amountAdd1 Amount of token1 to add
     * @return liquidity Amount of liquidity added
     * @return amount0 Amount of token0 added
     * @return amount1 Amount of token1 added
     */
    function increaseLiquidity(
        uint256 tokenId,
        uint256 amountAdd0,
        uint256 amountAdd1
    ) external returns (uint128 liquidity, uint256 amount0, uint256 amount1) {
        Deposit memory position = deposits[tokenId];
        if (msg.sender != position.owner) revert NotAnOwner({tokenId: tokenId});
        TransferHelper.safeTransferFrom(
            position.token0,
            msg.sender,
            address(this),
            amountAdd0
        );
        TransferHelper.safeTransferFrom(
            position.token1,
            msg.sender,
            address(this),
            amountAdd1
        );

        TransferHelper.safeApprove(
            position.token0,
            address(positionManager),
            amountAdd0
        );

        TransferHelper.safeApprove(
            position.token1,
            address(positionManager),
            amountAdd1
        );

        (liquidity, amount0, amount1) = positionManager.increaseLiquidity(
            INonfungiblePositionManager.IncreaseLiquidityParams({
                tokenId: tokenId,
                amount0Desired: amountAdd0,
                amount1Desired: amountAdd1,
                amount0Min: 0,
                amount1Min: 0,
                deadline: block.timestamp
            })
        );
        uint128 newLiquidity = deposits[tokenId].liquidity += liquidity;

        emit LiquidityIncreased(
            tokenId,
            msg.sender,
            newLiquidity,
            amount0,
            amount1
        );

        return (liquidity, amount0, amount1);
    }

    /**
     * @dev Swaps an exact amount of input tokens for as much output tokens as possible.
     * @param tokenIn Input token address
     * @param amountIn Amount of input tokens
     * @param amountOutMinimum Minimum amount of output tokens expected
     * @param path Path of tokens to swap through
     * @return amountOut Amount of output tokens received
     */
    function swapExactInput(
        address tokenIn,
        uint256 amountIn,
        uint256 amountOutMinimum,
        bytes memory path
    ) external returns (uint256 amountOut) {
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountIn
        );
        TransferHelper.safeApprove(tokenIn, address(swapRouter), amountIn);
        amountOut = swapRouter.exactInput(
            ISwapRouter.ExactInputParams({
                path: path,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountIn: amountIn,
                amountOutMinimum: amountOutMinimum
            })
        );

        emit SwapExactInput(tokenIn, amountIn, amountOut);

        return amountOut;
    }

    /**
     * @dev Swaps as much input tokens as possible for an exact amount of output tokens.
     * @param tokenIn Input token address
     * @param amountOut Amount of output tokens desired
     * @param amountInMaximum Maximum amount of input tokens to spend
     * @param path Path of tokens to swap through
     * @return amountIn Amount of input tokens spent
     */
    function swapExactOutput(
        address tokenIn,
        uint256 amountOut,
        uint256 amountInMaximum,
        bytes memory path
    ) external returns (uint256 amountIn) {
        TransferHelper.safeTransferFrom(
            tokenIn,
            msg.sender,
            address(this),
            amountInMaximum
        );
        TransferHelper.safeApprove(
            tokenIn,
            address(swapRouter),
            amountInMaximum
        );

        amountIn = swapRouter.exactOutput(
            ISwapRouter.ExactOutputParams({
                path: path,
                recipient: msg.sender,
                deadline: block.timestamp,
                amountOut: amountOut,
                amountInMaximum: amountInMaximum
            })
        );

        if (amountIn < amountInMaximum) {
            TransferHelper.safeApprove(tokenIn, address(swapRouter), 0);
            TransferHelper.safeTransfer(
                tokenIn,
                msg.sender,
                (amountInMaximum - amountIn)
            );
        }

        emit SwapExactOutput(tokenIn, amountIn, amountOut);

        return amountIn;
    }
}
