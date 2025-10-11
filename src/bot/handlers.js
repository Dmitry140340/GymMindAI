import { 
  createOrUpdateUser, 
  getUserByTelegramId, 
  getActiveSubscription,
  checkExpiredSubscriptions,
  getUserAccessToken,
  updateUserAgreement,
  // ������ ������� ��� ���������
  addFitnessMetric,
  addWorkout,
  addAchievement,
  getUserMetrics,
  getUserWorkouts,
  getUserAchievements,
  // ������ ������� ��� ���������� ��������
  getUserFreeRequests,
  useFreeRequest,
  canUserMakeRequest,
  incrementRequestUsage,
  // ������ ������� ��� ���������� ����������������� �������
  saveFitnessMetric,
  setUserGoal,
  getUserGoals,
  saveWorkout,
  getLastWeightRecord,
  updateLastWeightRecord,
  deleteLastWeightRecord,
  getLastWorkoutRecord,
  updateLastWorkoutRecord,
  deleteLastWorkoutRecord,
  deleteUserGoal,
  updateUserGoal,
  clearAllUserData,
  getUserDataSummary,
  // ������ ������� ��� ��������� ����������
  saveDetailedWorkout,
  getDetailedWorkout,
  getUserDetailedWorkouts,
  updateDetailedWorkout,
  getExerciseProgressStats,
  // ������ ������� ��� �������� �������
  deleteLastWorkout,
  deleteLastWeight,
  deleteAllWorkouts,
  deleteAllWeights
} from '../services/database.js';
import { runWorkflow, getConversationId, clearConversation, continueInteractiveWorkflow } from '../services/coze.js';
import { runDeepSeekChat, clearConversationHistory } from '../services/deepseek.js';
import { createSubscriptionPayment } from '../services/payment.js';
import { 
  generateWeightChart, 
  generateWorkoutChart, 
  generateProgressChart, 
  generateTextReport 
} from '../services/analytics.js';
import {
  mainKeyboard,
  subscriptionKeyboard,
  confirmPaymentKeyboard,
  paymentLinkKeyboard,
  manageSubscriptionKeyboard,
  noSubscriptionKeyboard,
  helpKeyboard,
  analyticsKeyboard,
  workoutKeyboard,
  userAgreementKeyboard,
  aiToolsKeyboard,
  userDataKeyboard,
  workoutTypesKeyboard,
  detailedWorkoutKeyboard,
  popularExercisesKeyboard,
  viewRecordsKeyboard,
  deleteRecordsKeyboard,
  goalTypesKeyboard,
  subscriptionPlansKeyboard,
  paymentConfirmKeyboard
} from './keyboards.js';

// ������ ��������� �������������
const userStates = new Map();
// ������ �������� ���������� workflow ��� ������� ������������
const userWorkflowContext = new Map();
// ������ ��������� ������������� workflow
const userInteractiveWorkflow = new Map();
// ������ �������� ���������� �������������
const activeWorkouts = new Map();

// ������� ��� ������� Markdown �������� �� ������
function cleanMarkdown(text) {
  if (!text) return text;
  
  return text
    .replace(/[#*_`\[\]]/g, '') // ������� #, *, _, `, [, ]
    .replace(/\n{3,}/g, '\n\n'); // �������� ������������� �������� ����� �� �������
}

// ������� ��� ���������� �������� ������� ���������
async function sendLongMessage(bot, chatId, message, keyboard = null) {
  const maxLength = 4096;
  
  // ������� Markdown ��� �������������� ������ ��������
  const cleanMessage = cleanMarkdown(message);
  
  if (cleanMessage.length <= maxLength) {
    const options = {};
    if (keyboard) {
      Object.assign(options, keyboard);
    }
    await bot.sendMessage(chatId, cleanMessage, options);
  } else {
    const parts = [];
    let currentPart = '';
    const lines = cleanMessage.split('\n');
    
    for (const line of lines) {
      if ((currentPart + line + '\n').length > maxLength) {
        if (currentPart) parts.push(currentPart);
        currentPart = line + '\n';
      } else {
        currentPart += line + '\n';
      }
    }
    if (currentPart) parts.push(currentPart);
    
    for (let i = 0; i < parts.length; i++) {
      const isLast = i === parts.length - 1;
      const options = {};
      if (isLast && keyboard) {
        Object.assign(options, keyboard);
      }
      await bot.sendMessage(chatId, parts[i], options);
    }
  }
}

export function setupBotHandlers(bot) {
  // ������� /start � ��������� ����������
  bot.onText(/\/start(?:\s+(.+))?/, async (msg, match) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    const startParam = match ? match[1] : null;

    try {
      // ������� ��� ��������� ������������ � ��
      await createOrUpdateUser(user);
      
      // �������� ���������� � ������������
      const dbUser = await getUserByTelegramId(user.id);
      
      // ���������, ���� �� �������� payment_success
      if (startParam === 'payment_success') {
        await bot.sendMessage(
          chatId,
          '?? ������� �� ������!\n\n' +
          '���� ���� �������� ��� ������������, �� ������ ������ ������� � ��-�������� ����� ������!\n\n' +
          '?? ������� "������ � ��-�������" ��� ������ ������� ����� ������ � �������.',
          mainKeyboard
        );
        return;
      }
      
      // ���������, ������ �� ������������ ����������
      if (!dbUser.agreement_accepted) {
        await bot.sendMessage(
          chatId,
          '?? **����� ���������� � FitnessBotAI!**\n\n' +
          '����� ������� ������ � �����, ����������, ������������ � ����� ���������������� �����������.\n\n' +
          '?? � ��������� �������:\n' +
          '� ������� ������������� �������\n' +
          '� ������� ��������� ������������ ������\n' +
          '� �������� ������������������\n' +
          '� ���� ����� � �����������\n\n' +
          '?? ��� ����������� ������ � ����� ���������� ������� ������� ����������.',
          userAgreementKeyboard
        );
        return;
      }
      
      const welcomeMessage = `?? ����� ���������� � FitnessBotAI!

?? � ��� ������ ��-������, ������� ������ ��� ������� ����� ������-�����!

? ��� � ����:
� ���������� ������������ ��������� ����������
� ������ ������ �� �������
� �������� �� ������� � ������� � ��������
� ������������ � ������������ ���

?? ��� ������� ������� �� ���� �������� ����� ��������.

�������� ��������:`;

      await bot.sendMessage(chatId, welcomeMessage, mainKeyboard);
    } catch (error) {
      console.error('������ � ������� /start:', error);
      await bot.sendMessage(chatId, '��������� ������. ���������� ��� ���.');
    }
  });

  // ��������� ��������� ���������
  bot.on('message', async (msg) => {
    if (msg.text) {
      // ������ ��������� ������ ���� (�� �������� � Coze)
      const systemCommands = ['/start', '/menu', '/reset', '/�����', '/help', '/admin_test_coze', '/admin_stats', '/admin_users'];
      
      // ���� ��� �� ��������� ������� - ������������ ��� ������� ���������
      if (!systemCommands.some(cmd => msg.text.startsWith(cmd))) {
        await handleTextMessage(bot, msg);
      }
    }
  });

  // ��������� callback ��������
  bot.on('callback_query', async (callbackQuery) => {
    await handleCallbackQuery(bot, callbackQuery);
  });

  // ������������� �������� �������� ��������
  setInterval(async () => {
    try {
      await checkExpiredSubscriptions();
    } catch (error) {
      console.error('������ �������� ��������:', error);
    }
  }, 60 * 60 * 1000); // ������ ���
}

// ������� ��� ������������� ������-��������
function isFitnessQuestion(text) {
  // ��������� ��� ������ ���������� - ������ ������ ����� ����� ���� ������-��������
  const interfaceButtons = [
    // �������� ������
    '?? ��-������', '?? ��-�����������', '?? ��������', '? ��� �������',
    '?? ���������', '?? ��� ������', '?? ����� ������', '? ������',
    
    // ������ ���������
    '?? ������ ����', '????>? ������ ����������', '?? ����� �����', '?? ����������',
    
    // ������ ����������
    '?? ������� ����������', '???>? ������', '???+? ����/��������', '?? ������������',
    '?? ��������� ������', '? ������� ������',
    
    // ������ ���������� �������
    '?? �������� ���', '?? ���������� ����', '????>? �������� ����������', '?? ��� ������',
    '????>? ������� ����������', '?? ������� ����', '?? ��� ����', '?? ��������',
    
    // ������ �����
    '????>? ������� �������� �����', '?? ������� ���', '?? ��������� ����', 
    '???>? �������� ������������', '???>? �������� ��������', '? ����� �������������',
    
    // ������ ��������
    '?? �������� ��������', '?? ������ ��������', '?? �������� ��������', 
    '?? ������� ��������', '?? �������� ��������', '?? ������������ ��������',
    
    // ������ ������
    '?? ��� ������������ �����?', '? ��� ����� ��-������?',
    
    // ������ ��������
    '??? ������� ������', '??? ������� ����������', '??? ������� ����', 
    '??? ������� ����', '??? ������� ���',
    
    // ������ ��������� ����������
    '? �������� ����������', '? ��������� ����������', '????>? ��� ����', 
    '????>? ����������', '????>? �������� ����', '????>? ������������', '?? ������ ����������',
    
    // ��������� ������
    '? ������', '?? ����� � ����', '?? �����', '? ��', '? ���', '? ����������',
    
    // ������ workflow (��� �������������� ��������)
    '????>? /training_program', '?? /nutrition_plan', '?? /deepresearch', '?? /composition_analysis'
  ];
  
  // ���� ��� ������ ����������, �� ��� �� ������-������ ��� ��
  if (interfaceButtons.includes(text)) {
    return false;
  }

  const fitnessKeywords = [
    '���������', '��������', '��������', '�����', '�����',
    '�������', '�����', '������', '�����', '�������', '���',
    '��������', '��������', '���', '���������', '��������',
    '����', '�����', '��������', '�������', '������',
    '������', '���', '����', '������', '�����',
    '�����', '���', '���', '����', '�����', '����',
    '��������', '���������', '�����������', '������',
    '���', '������', '���������', '�������',
    '��������', '�������', '������������', '����'
  ];
  
  const lowerText = text.toLowerCase();
  return fitnessKeywords.some(keyword => lowerText.includes(keyword));
}

async function handleTextMessage(bot, msg) {
  const chatId = msg.chat.id;
  let text = msg.text; // �������� const �� let, ����� ����� ���� ��������������
  const user = msg.from;

  // �������� ��� ���������� ���������
  console.log(`?? �������� ��������� �� ������������ ${user.id}:`, text);

  try {
    // ��������� ���������� ������������
    await createOrUpdateUser(user);
    const dbUser = await getUserByTelegramId(user.id);

    // === �������������� ��������� ������ ���������� ===
    // ��� ������ ������ �������������� ������, ���������� �� ��������
    // ��� ������ ���������� ���������� ����� ��-�������
    
    // ��������� ������ "��� ������" � ������ ������� ��������� ������
    if (text === '?? ��� ������' || text.includes('��� ������')) {
      userStates.delete(user.id); // ���������� ����� ��-�������
      await bot.sendMessage(
        chatId,
        '?? **���������� �������**\n\n' +
        '����� �� ������:\n' +
        '� ?? ���������� � ����������� ���\n' +
        '� ?? ������������� � �������� ����\n' +
        '� ????>? ��������� ����������\n' +
        '� ?? ������������� ���� ������\n' +
        '� ?? ������������� ������\n' +
        '� ??? ������� ������\n\n' +
        '�������� ��������:',
        { parse_mode: 'Markdown', ...userDataKeyboard }
      );
      return;
    }

    if (text === '?? ��-�����������' || text.includes('��-�����������')) {
      userStates.delete(user.id); // ���������� ����� ��-�������
      await bot.sendMessage(
        chatId,
        '?? **��-�����������**\n\n' +
        '?? ����������� �������� ������� ��� ������ � ��:\n\n' +
        '� ????>? `/training_program` - �������� ������������ ��������� ����������\n' +
        '� ?? `/nutrition_plan` - ����������� ����� �������\n' +
        '� ?? `/deepresearch` - �������� ������� ������������\n' +
        '� ?? `/composition_analysis` - ������ ������� �������\n\n' +
        '������� �� ������� ��� �������� �� ����:',
        { parse_mode: 'Markdown', ...aiToolsKeyboard }
      );
      return;
    }

    // ��������� ������ ��-������
    if (text === '????>? /training_program') {
      text = '/training_program'; // �������������� ����� ��� ���������� ���������
    }
    
    if (text === '?? /nutrition_plan') {
      text = '/nutrition_plan'; // �������������� ����� ��� ���������� ���������
    }
    
    if (text === '?? /deepresearch') {
      text = '/deepresearch'; // �������������� ����� ��� ���������� ���������
    }
    
    if (text === '?? /composition_analysis') {
      text = '/composition_analysis'; // �������������� ����� ��� ���������� ���������
    }

    if (text === '?? ����� � ����' || text.includes('����� � ����')) {
      userStates.delete(user.id); // ���������� ���������
      await bot.sendMessage(
        chatId,
        '?? ������� ����\n\n�������� ��������:',
        mainKeyboard
      );
      return;
    }

    if (text === '? ������') {
      // �������� ������� �������� � ������������ � ����
      userStates.delete(user.id); // ���������� ���������
      activeWorkouts.delete(user.id); // �������� �������� ���������� ���� ����
      await bot.sendMessage(
        chatId,
        '? �������� ��������\n\n?? ������������ � ������� ����:',
        mainKeyboard
      );
      return;
    }

    if (text === '?? ��������' || text.includes('��������')) {
      userStates.delete(user.id); // ���������� ����� ��-�������
      await showSubscriptionMenu(bot, chatId, dbUser.id);
      return;
    }

    // ����������� ������ ��������
    if (text === '?? ������ ��������') {
      userStates.delete(user.id); // ���������� ����� ��-�������
      await showSubscriptionStatus(bot, chatId, null, dbUser.id);
      return;
    }

    if (text === '?? ������� ��������') {
      userStates.delete(user.id); // ���������� ����� ��-�������
      await showPaymentHistory(bot, chatId, dbUser.id);
      return;
    }

    if (text === '?? �������� ��������') {
      userStates.delete(user.id); // ���������� ����� ��-�������
      
      const basicPrice = process.env.BASIC_PRICE || '150';
      const standardPrice = process.env.STANDARD_PRICE || '300';
      const premiumPrice = process.env.PREMIUM_PRICE || '450';
      
      await bot.sendMessage(
        chatId,
        `?? ��������� ��������\n\n�������� ����:\n\n` +
        `?? **������� ����** - ${basicPrice}?/���\n` +
        `� 100 �������� � ��-�������\n` +
        `� �������� ������������� ���������\n` +
        `� ������� ������ �� �������\n\n` +
        
        `? **����������� ����** - ${standardPrice}?/���\n` +
        `� 300 �������� � ��-�������\n` +
        `� ������������ ��������� ����������\n` +
        `� ��������� ����� �������\n` +
        `� ������ ������� �������\n\n` +
        
        `?? **������� ����** - ${premiumPrice}?/���\n` +
        `� 600 �������� � ��-�������\n` +
        `� ��� ����������� ��-�������\n` +
        `� ������������ ���������\n` +
        `� ������������ ������������\n\n` +
        
        `�������� ���� ������� ����:`,
        { parse_mode: 'Markdown', ...subscriptionPlansKeyboard }
      );
      return;
    }

    if (text === '?? �������� ��������' || text === '?? �������� ��������') {
      userStates.delete(user.id); // ���������� ����� ��-�������
      
      const basicPrice = process.env.BASIC_PRICE || '150';
      const standardPrice = process.env.STANDARD_PRICE || '300';
      const premiumPrice = process.env.PREMIUM_PRICE || '450';
      
      await bot.sendMessage(
        chatId,
        `?? �������� ���� ��������:\n\n` +
        `? **������� ����** - ${basicPrice}?/���\n` +
        `� 100 �������� � ��-�������\n` +
        `� �������� ������������� ���������\n` +
        `� ������� ������ �� �������\n\n` +
        
        `? **����������� ����** - ${standardPrice}?/���\n` +
        `� 300 �������� � ��-�������\n` +
        `� ������������ ��������� ����������\n` +
        `� ��������� ����� �������\n` +
        `� ������ ������� �������\n\n` +
        
        `?? **������� ����** - ${premiumPrice}?/���\n` +
        `� 600 �������� � ��-�������\n` +
        `� ��� ����������� ��-�������\n` +
        `� ������������ ���������\n` +
        `� ������������ ������������\n\n` +
        
        `�������� ���� ������� ����:`,
        { parse_mode: 'Markdown', ...subscriptionPlansKeyboard }
      );
      return;
    }

    if (text === '?? ������������ ��������') {
      await bot.sendMessage(
        chatId,
        '? **������������ ��������:**\n\n' +
        '?? **�������������� ������� � ��-��������**\n' +
        '� ������������ ������ �� ����� ������-�������\n' +
        '� ����������� �������������� ��������\n' +
        '� ������ �� ������� � ����������� �������\n\n' +
        '?? **������ � ����������� ��-������������:**\n' +
        '� ?? �������� ������� ������\n' +
        '� ????>? ������������ ��������� ����������\n' +
        '� ?? �������������� ����� �������\n' +
        '� ?? ���������������� ������ �������\n\n' +
        '?? **����������� ���������:**\n' +
        '� ��������� ������� ���������\n' +
        '� ������������ ������\n' +
        '� ������� ����������\n\n' +
        '?? **���������� �������:**\n' +
        '� ������� �������� ����������\n' +
        '� ������������ ���� � ������\n' +
        '� ���������� � �������� �����',
        { parse_mode: 'Markdown', ...subscriptionKeyboard }
      );
      return;
    }

    // ����������� ������ ������ ��������
    if (text === '?? ������� ���� - 150?') {
      userStates.set(user.id, { action: 'selected_plan', planType: 'basic' });
      await bot.sendMessage(
        chatId,
        '?? **������� ����** - 150?/�����\n\n' +
        '? **��� ��������:**\n' +
        '� 100 �������� � ��-�������\n' +
        '� �������� ������������� ���������\n' +
        '� ������� ������ �� �������\n' +
        '� ������� �������� ����������\n\n' +
        '?? **������� ������:**\n' +
        '� ���������� ����� (Visa, MasterCard, ���)\n' +
        '� �Money\n' +
        '� ��� (������� ������� ��������)\n\n' +
        '?? ����� ������ ������ ������������ �������������!\n\n' +
        '?? **������� ������ ��� �������� ������ �� ������:**',
        { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
      );
      return;
    }

    if (text === '? ����������� ���� - 300?') {
      userStates.set(user.id, { action: 'selected_plan', planType: 'standard' });
      await bot.sendMessage(
        chatId,
        '? **����������� ����** - 300?/�����\n\n' +
        '? **��� ��������:**\n' +
        '� 300 �������� � ��-�������\n' +
        '� ������������ ��������� ����������\n' +
        '� ��������� ����� �������\n' +
        '� ������ ������� �������\n' +
        '� ����������� ���������\n' +
        '� ������������ ���������\n\n' +
        '?? **������� ������:**\n' +
        '� ���������� ����� (Visa, MasterCard, ���)\n' +
        '� �Money\n' +
        '� ��� (������� ������� ��������)\n\n' +
        '?? ����� ������ ������ ������������ �������������!\n\n' +
        '?? **������� ������ ��� �������� ������ �� ������:**',
        { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
      );
      return;
    }

    if (text === '?? ������� ���� - 450?') {
      userStates.set(user.id, { action: 'selected_plan', planType: 'premium' });
      await bot.sendMessage(
        chatId,
        '?? **������� ����** - 450?/�����\n\n' +
        '? **��� ��������:**\n' +
        '� 600 �������� � ��-�������\n' +
        '� ��� ����������� ��-�������\n' +
        '� ������������ ���������\n' +
        '� ������������ ������������\n' +
        '� ������������ ������������\n' +
        '� ����������� ���������\n' +
        '� ������� ������\n\n' +
        '?? **������� ������:**\n' +
        '� ���������� ����� (Visa, MasterCard, ���)\n' +
        '� �Money\n' +
        '� ��� (������� ������� ��������)\n\n' +
        '?? ����� ������ ������ ������������ �������������!\n\n' +
        '?? **������� ������ ��� �������� ������ �� ������:**',
        { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
      );
      return;
    }

    if (text === '?? �������� ������') {
      const state = userStates.get(user.id);
      if (state && state.action === 'selected_plan') {
        // ������� ������
        await bot.sendChatAction(chatId, 'typing');
        const loadingMsg = await bot.sendMessage(chatId, '?? ������ ������ ��� ������...');
        
        const paymentResult = await createSubscriptionPayment(user.id, state.planType);
        
        await bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
        
        if (paymentResult.success) {
          const planNames = {
            'basic': '?? ������� ����',
            'standard': '? ����������� ����', 
            'premium': '?? ������� ����'
          };
          
          await bot.sendMessage(
            chatId,
            `? **������ ��� ������ �������!**\n\n` +
            `?? **������ �������:**\n` +
            `� ����: ${planNames[state.planType]}\n` +
            `� �����: ${paymentResult.amount}?\n` +
            `� ��������: ${paymentResult.description}\n\n` +
            `?? **[�������� ��������](${paymentResult.paymentUrl})**\n\n` +
            `?? **����������:**\n` +
            `1. ������� �� ������ ����\n` +
            `2. �������� ������ ������\n` +
            `3. ������� ������ ����� ��� ������� � �Money\n` +
            `4. ����������� ������\n` +
            `5. ������ ������������ �������������!\n\n` +
            `?? ������ ������������� 15 �����`,
            { 
              parse_mode: 'Markdown',
              reply_markup: {
                keyboard: [
                  [{ text: '?? ������ ��������' }],
                  [{ text: '?? ����� � ������' }],
                  [{ text: '?? ����� � ����' }]
                ],
                resize_keyboard: true,
                one_time_keyboard: false
              }
            }
          );
          userStates.delete(user.id);
        } else {
          await bot.sendMessage(
            chatId,
            `? **������ �������� �������**\n\n${paymentResult.error}\n\n���������� ����� ��� ���������� � ���������.`,
            { parse_mode: 'Markdown', ...paymentConfirmKeyboard }
          );
        }
      } else {
        await bot.sendMessage(
          chatId,
          '? ������� �������� ���� ��������.',
          subscriptionPlansKeyboard
        );
      }
      return;
    }

    if (text === '?? ����� � ������') {
      userStates.delete(user.id);
      const basicPrice = process.env.BASIC_PRICE || '150';
      const standardPrice = process.env.STANDARD_PRICE || '300';
      const premiumPrice = process.env.PREMIUM_PRICE || '450';
      
      await bot.sendMessage(
        chatId,
        `?? �������� ���� ��������:\n\n` +
        `?? **������� ����** - ${basicPrice}?/���\n` +
        `� 100 �������� � ��-�������\n\n` +
        `? **����������� ����** - ${standardPrice}?/���\n` +
        `� 300 �������� � ��-�������\n\n` +
        `?? **������� ����** - ${premiumPrice}?/���\n` +
        `� 600 �������� � ��-�������\n\n` +
        `�������� ���� ������� ����:`,
        { parse_mode: 'Markdown', ...subscriptionPlansKeyboard }
      );
      return;
    }

    if (text === '?? ����� � ��������') {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '?? ���������� ���������\n\n�������� ��������:',
        subscriptionKeyboard
      );
      return;
    }

    if (text === '?? ��� �������' || text.includes('��� �������')) {
      await showUserProfile(bot, chatId, dbUser);
      return;
    }

    if (text === '? ������' || text.includes('������')) {
      await bot.sendMessage(
        chatId,
        '? ������� � ������\n\n�������� ������������ ��� ������:',
        helpKeyboard
      );
      return;
    }

    if (text === '?? ���������' || text.includes('���������')) {
      await bot.sendMessage(
        chatId,
        '?? ��������� � ����������\n\n�������� ��� ������, ������� ������ ����������:',
        analyticsKeyboard
      );
      return;
    }

    if (text === '?? ����� � ����') {
      userStates.delete(user.id); // ���������� ���������
      await bot.sendMessage(
        chatId,
        '?? ������� ����\n\n�������� ��������:',
        mainKeyboard
      );
      return;
    }

    if (text === '?? ��������') {
      await showSubscriptionMenu(bot, chatId, dbUser.id);
      return;
    }

    if (text === '?? ��� �������') {
      await showUserProfile(bot, chatId, dbUser);
      return;
    }

    if (text === '? ������') {
      await bot.sendMessage(
        chatId,
        '? ������� � ������\n\n�������� ������������ ��� ������:',
        helpKeyboard
      );
      return;
    }

    // ����������� ������ ������
    if (text === '?? ��� ������������ �����?' || text.includes('��� ������������ �����')) {
      await bot.sendMessage(
        chatId,
        '?? **��� ������������ �����**\n\n' +
        '?? **��-������** - ��� ������������ ��������:\n' +
        '� �������� �� ������� � ������� � �������\n' +
        '� ���������� ��������� ����������\n' +
        '� ���� ������ �� ��������� ������ �����\n\n' +
        '?? **��-�����������** - ����������� �������:\n' +
        '� `/training_program` - ������������ ���������\n' +
        '� `/nutrition_plan` - ����� �������\n' +
        '� `/deepresearch` - ������� ������������\n' +
        '� `/composition_analysis` - ������ �������\n\n' +
        '?? **��� ������** - ������������ ���������:\n' +
        '� ����������� ��� � ����������\n' +
        '� �������������� ����\n' +
        '� �������������� �������\n\n' +
        '?? **���������** - ������� � ������:\n' +
        '� ������ ��������� ����\n' +
        '� ���������� ����������\n' +
        '� ����� ����� ���������\n\n' +
        '?? **��������** - ������ � ������� ��������',
        { parse_mode: 'Markdown', ...helpKeyboard }
      );
      return;
    }

    if (text === '? ��� ����� ��-������?' || text.includes('��� ����� ��-������')) {
      await bot.sendMessage(
        chatId,
        '? **��� ����� ��-������**\n\n' +
        '????>? **����������:**\n' +
        '� ����������� ������������ ��������\n' +
        '� ������ ���������� ��� ��� �������\n' +
        '� ������ �� ������� ����������\n' +
        '� ������������ ������������\n\n' +
        '?? **�������:**\n' +
        '� ������ ������� � ���\n' +
        '� ����������� ��������\n' +
        '� ������ �� ����������� �������\n' +
        '� ������ ���� � �� �������������\n\n' +
        '?? **����:**\n' +
        '� ��������� � �����\n' +
        '� ����� �������� �����\n' +
        '� ���������� ���� � ������������\n' +
        '� ������������ � ��������������\n\n' +
        '?? **������� ������:**\n' +
        '� ������ ������������\n' +
        '� �������� ���������� �������\n' +
        '� ����������� �����\n' +
        '� ������������������� ������������\n\n' +
        '?? ������ ��������� ����� ������� ����� ������ "?? ��-������"!',
        { parse_mode: 'Markdown', ...helpKeyboard }
      );
      return;
    }

    if (text === ' ���������') {
      await bot.sendMessage(
        chatId,
        '?? ��������� � ����������\n\n�������� ��� ������, ������� ������ ����������:',
        analyticsKeyboard
      );
      return;
    }

    if (text === '?? ��-������') {
      // ��������� ����������� ������ �������
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        await bot.sendMessage(
          chatId,
          '?? � ��� ����������� ������� � ��-�������.\n\n' +
          '?? ����� ������������ �������� 7 ���������� ��������\n' +
          '?? ��� ��������������� ������� �������� ��������!',
          noSubscriptionKeyboard
        );
        return;
      }

      // ���������� ���������� � ��������� ��������
      let requestInfo = '';
      if (requestStatus.type === 'free') {
        requestInfo = `\n\n?? ���������� �������� ��������: ${requestStatus.remaining}/7`;
      } else if (requestStatus.type === 'subscription') {
        requestInfo = `\n\n?? �������� �� ��������: ${requestStatus.remaining}/${requestStatus.total}`;
      }

      // ���������� ����� ������� � ��
      userStates.set(user.id, 'chatting_with_ai');
      
      // ������� �������� ���������� Coze
      try {
        const accessToken = await getUserAccessToken(dbUser.id);
        if (accessToken) {
          // ������� getCozeInstructions ��� ��� �� ������ �� �����
          // const instructions = await getCozeInstructions(accessToken);
          await bot.sendMessage(chatId, instructions.message + requestInfo, { parse_mode: 'Markdown' });
        } else {
          await bot.sendMessage(
            chatId,
            '?? *����� ���������� � ��-������!*\n\n' +
            '� ������ ��� �:\n' +
            '� ������������ �������� ����������\n' +
            '� �������� �� �������\n' +
            '� ��������� � �������� � �������\n\n' +
            '��������� ����� �������!' + requestInfo,
            { parse_mode: 'Markdown' }
          );
        }
      } catch (error) {
        await bot.sendMessage(
          chatId,
          '?? *����� ���������� � ��-������!*\n\n' +
          '� ������ ��� �:\n' +
          '� ������������ �������� ����������\n' +
          '� �������� �� �������\n' +
          '� ��������� � �������� � �������\n\n' +
          '��������� ����� �������!' + requestInfo,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    if (text === '?? ��-�����������') {
      // ��������� �������� ������������
      const subscription = await getActiveSubscription(dbUser.id);
      
      if (!subscription) {
        await bot.sendMessage(
          chatId,
          '?? **��-����������� �������� ������ � ���������**\n\n' +
          '?? ����������� ����������� ��������:\n' +
          '� ?? �������� ������� ������\n' +
          '� ????>? ������������ ��������� ����������\n' +
          '� ?? �������������� ����� �������\n' +
          '� ?? ���������������� ������ �������\n\n' +
          '?? �������� �������� ��� ������� �� ���� ������������!',
          { parse_mode: 'Markdown', ...noSubscriptionKeyboard }
        );
        return;
      }
      
      await bot.sendMessage(
        chatId,
        '?? **����������� ��-�����������**\n\n' +
        '�������� ������ ����������:\n\n' +
        '?? **�������� ������** - ��������� ������� ������������ ����� ����\n' +
        '????>? **���� ����������** - ������������ ��������� ��� ���� ����\n' +
        '?? **���� �������** - �������������� ������ � �������� ����\n' +
        '?? **������ �������** - ���������� ������ ������� � �������������',
        { parse_mode: 'Markdown', ...aiToolsKeyboard }
      );
      return;
    }

    if (text === '?? ����� ������') {
      // ���������� ��������� ������������
      userStates.delete(user.id);
      
      // ������� �������� workflow
      userWorkflowContext.delete(user.id);
      console.log(`??? ������ �������� workflow ��� ������������ ${user.id}`);
      
      // ������� conversation_id ������������
      clearConversation(dbUser.id);
      clearConversationHistory(user.id); // Очистка истории DeepSeek
      
      await bot.sendMessage(
        chatId,
        '?? ������ �������!\n\n������ ��-������ �� ������ ���� ���������� ��������� � �������� ��������. ������ ������ ����� ��������.',
        mainKeyboard
      );
      return;
    }

    // ����������� ���������
    if (text === '?? ������ ����') {
      await handleWeightChart(bot, chatId, dbUser.id);
      return;
    }

    if (text === '????>? ������ ����������') {
      await handleWorkoutChart(bot, chatId, dbUser.id);
      return;
    }

    if (text === '?? ����� �����') {
      await handleProgressReport(bot, chatId, dbUser.id);
      return;
    }

    if (text === '?? ����������') {
      await handleAchievements(bot, chatId, dbUser.id);
      return;
    }

    // === ����������� ������ ���������� ������� ===
    
    // ������ ����
    if (text === '?? �������� ���') {
      userStates.set(user.id, { action: 'waiting_weight' });
      await bot.sendMessage(
        chatId,
        '?? **������ ����**\n\n' +
        '������� ��� ������� ��� � �����������.\n\n' +
        '?? �������:\n' +
        '� `75.5`\n' +
        '� `68`\n' +
        '� `82.3`',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ��������� ����
    if (text === '?? ���������� ����') {
      await bot.sendMessage(
        chatId,
        '?? **��������� ����**\n\n' +
        '�������� ��� ����:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      return;
    }

    // ��������� ����� �����
    if (['????>? ������� �������� �����', '?? ������� ���', '?? ��������� ����', '???>? �������� ������������', '???>? �������� ��������', '? ����� �������������'].includes(text)) {
      const goalType = text.split(' ').slice(1).join(' ').toLowerCase();
      userStates.set(user.id, { action: 'waiting_goal_value', goalType: goalType });
      
      let prompt = '?? **��������� ����: ' + text + '**\n\n';
      if (text === '?? ������� ���') {
        prompt += '������� �������� ��� � �����������:\n\n?? ������: `70`';
      } else {
        prompt += '������� ���� ���� ��������:\n\n?? �������:\n� `��������� ��� ���� �� 100 ��`\n� `��������� 10 �� �� 45 �����`\n� `������� 5 �� �������� �����`';
      }
      
      await bot.sendMessage(chatId, prompt, { parse_mode: 'Markdown' });
      return;
    }

    // ���������� ����������
    if (text === '????>? �������� ����������') {
      await bot.sendMessage(
        chatId,
        '????>? **���������� ����������**\n\n' +
        '�������� ��� ����������:',
        { parse_mode: 'Markdown', ...workoutTypesKeyboard }
      );
      return;
    }

    // ��������� ����� ����������
    if (text === '?? �������') {
      // �������������� ����� ��������� ����������
      activeWorkouts.set(user.id, {
        type: 'strength',
        exercises: [],
        startTime: new Date(),
        moodBefore: 3 // ����������� ���������� �� ���������
      });
      
      await bot.sendMessage(
        chatId,
        '?? **������� ���������� ������!**\n\n' +
        '???>? ���������� ���������� �� ���� �� ����������.\n' +
        '��� ������� ���������� �� ������� �������� ���������� ��������, ��� ����������, ���������� � �������� �����������.',
        { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
      );
      
      return;
    }

    if (['???>? ������', '???>? ����/��������', '???>? ��������', '???>? ���������', '?? ������������', '? ���������� ����', '???>? ������'].includes(text)) {
      const workoutType = text.split(' ').slice(1).join(' ');
      userStates.set(user.id, { action: 'waiting_workout_duration', workoutType: workoutType });
      
      await bot.sendMessage(
        chatId,
        '?? **������������ ����������**\n\n' +
        `���: ${text}\n\n` +
        '������� ����������������� ���������� � �������:\n\n' +
        '?? �������:\n' +
        '� `45` (45 �����)\n' +
        '� `90` (1.5 ����)\n' +
        '� `30` (30 �����)',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // �������� �������
    if (text === '?? ��� ������') {
      await bot.sendMessage(
        chatId,
        '?? **��� ������**\n\n' +
        '��� �� ������ ����������?',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    // ���������� ��������
    if (text === '?? �������� ������') {
      await bot.sendMessage(
        chatId,
        '?? **��������� ������**\n\n' +
        '��� �� ������ ��������?',
        { parse_mode: 'Markdown', ...manageRecordsKeyboard }
      );
      return;
    }

    // �������� �������
    if (text === '??? ������� ������') {
      await bot.sendMessage(
        chatId,
        '??? **�������� �������**\n\n' +
        '?? ������ ���������! ��������� ������ ������������ ������.\n\n' +
        '��� �� ������ �������?',
        { parse_mode: 'Markdown', ...deleteRecordsKeyboard }
      );
      return;
    }

    // === ����������� �������� ������� ===
    
    if (text === '??? ������� ��������� ����������') {
      await handleDeleteLastWorkout(bot, chatId, dbUser.id);
      return;
    }
    
    if (text === '??? ������� ��������� ���') {
      await handleDeleteLastWeight(bot, chatId, dbUser.id);
      return;
    }
    
    if (text === '??? ������� ��� ����������') {
      await confirmDeleteAllWorkouts(bot, chatId, dbUser.id);
      return;
    }
    
    if (text === '??? ������� ��� ������ ����') {
      await confirmDeleteAllWeights(bot, chatId, dbUser.id);
      return;
    }

    // === ����������� ��������� ������� ===
    
    if (text === '?? ������� ����') {
      await showWeightHistory(bot, chatId, dbUser.id);
      return;
    }

    if (text === '?? ��� ����') {
      await showUserGoals(bot, chatId, dbUser.id);
      return;
    }

    if (text === '????>? ������� ����������') {
      await showWorkoutHistory(bot, chatId, dbUser.id);
      return;
    }

    if (text === '?? ����������') {
      await showUserStatistics(bot, chatId, dbUser.id);
      return;
    }

    // === ����������� ��������� ������� ===
    
    if (text === '?? �������� ��������� ���') {
      const lastWeight = await getLastWeightRecord(dbUser.id);
      if (!lastWeight) {
        await bot.sendMessage(chatId, '? � ��� ��� ������� ���� ��� ���������.');
        return;
      }
      
      userStates.set(user.id, { action: 'waiting_weight_update' });
      await bot.sendMessage(
        chatId,
        `?? **��������� ��������� ������ ����**\n\n` +
        `������� ���: **${lastWeight.value} ${lastWeight.unit}**\n` +
        `���� ������: ${new Date(lastWeight.recorded_at).toLocaleDateString('ru-RU')}\n\n` +
        `������� ����� ��� � �����������:`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    if (text === '?? �������� ����') {
      await bot.sendMessage(
        chatId,
        '?? **��������� ����**\n\n' +
        '�������� ��� ���� ��� ���������:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      return;
    }

    if (text === '?? �������� ����������') {
      const lastWorkout = await getLastWorkoutRecord(dbUser.id);
      if (!lastWorkout) {
        await bot.sendMessage(chatId, '? � ��� ��� ������� ���������� ��� ���������.');
        return;
      }
      
      userStates.set(user.id, { action: 'waiting_workout_update' });
      await bot.sendMessage(
        chatId,
        `?? **��������� ��������� ����������**\n\n` +
        `���: **${lastWorkout.workout_type}**\n` +
        `������������: **${lastWorkout.duration_minutes} ���**\n` +
        `�������: **${lastWorkout.calories_burned || 0}**\n` +
        `����: ${new Date(lastWorkout.workout_date).toLocaleDateString('ru-RU')}\n\n` +
        `�������� ����� ��� ����������:`,
        { parse_mode: 'Markdown', ...workoutTypesKeyboard }
      );
      return;
    }

    // === ����������� �������� ������� ===
    
    if (text === '??? ������� ��������� ���') {
      const lastWeight = await getLastWeightRecord(dbUser.id);
      if (!lastWeight) {
        await bot.sendMessage(chatId, '? � ��� ��� ������� ���� ��� ��������.');
        return;
      }
      
      const deleted = await deleteLastWeightRecord(dbUser.id);
      if (deleted) {
        await bot.sendMessage(
          chatId,
          `? **������ ���� �������**\n\n` +
          `������ ���: **${lastWeight.value} ${lastWeight.unit}**\n` +
          `����: ${new Date(lastWeight.recorded_at).toLocaleDateString('ru-RU')}`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } else {
        await bot.sendMessage(chatId, '? ������ ��� �������� ������ ����.');
      }
      return;
    }

    if (text === '??? ������� ����') {
      await bot.sendMessage(
        chatId,
        '??? **�������� ����**\n\n' +
        '�������� ��� ���� ��� ��������:',
        { parse_mode: 'Markdown', ...goalTypesKeyboard }
      );
      userStates.set(user.id, { action: 'delete_goal' });
      return;
    }

    if (text === '??? ������� ����������') {
      const lastWorkout = await getLastWorkoutRecord(dbUser.id);
      if (!lastWorkout) {
        await bot.sendMessage(chatId, '? � ��� ��� ������� ���������� ��� ��������.');
        return;
      }
      
      const deleted = await deleteLastWorkoutRecord(dbUser.id);
      if (deleted) {
        await bot.sendMessage(
          chatId,
          `? **���������� �������**\n\n` +
          `���: **${lastWorkout.workout_type}**\n` +
          `������������: **${lastWorkout.duration_minutes} ���**\n` +
          `����: ${new Date(lastWorkout.workout_date).toLocaleDateString('ru-RU')}`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } else {
        await bot.sendMessage(chatId, '? ������ ��� �������� ����������.');
      }
      return;
    }

    if (text === '??? �������� ���') {
      userStates.set(user.id, { action: 'confirm_clear_all' });
      await bot.sendMessage(
        chatId,
        '?? **��������!**\n\n' +
        '�� ����������� ������� ��� ���� ������:\n' +
        '� ������ ����\n' +
        '� ��� ����\n' +
        '� ������� ����������\n' +
        '� ����������\n\n' +
        '? ��� �������� ������ ��������!\n\n' +
        '������� `������� �Ѩ` ��� ������������� ��� ����� ������ ����� ��� ������.',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ��������� ������ "�����" ��� �������
    if (text === '?? �����') {
      const state = userStates.get(user.id);
      if (state && state.action === 'delete_goal') {
        userStates.delete(user.id);
      }
      await bot.sendMessage(
        chatId,
        '?? **���������� �������**\n\n�������� ��������:',
        { parse_mode: 'Markdown', ...userDataKeyboard }
      );
      return;
    }

    // ����������� ������ �� ��-������������
    if (text.includes('/deepresearch')) {
      // ��������� ��������
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '?? ��� ������� �������� ������ � ���������!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_research_topic');
      await bot.sendMessage(chatId, 
        '?? **�������� ������������**\n\n' +
        '������� ���� ��� ���������� �������� �������.\n\n' +
        '?? **������� ���:**\n' +
        '� ������� �������� �� ������� ����������\n' +
        '� ��������� �������� � ������� ��������\n' +
        '� ����������� ����� ��� ������ � �������\n' +
        '� ������������ ���������� ��� ������ �����\n' +
        '� ���������� ������� ��� ��������������\n\n' +
        '?? �������� ���� ����:'
      );
      return;
    }

    if (text.includes('/training_program')) {
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '?? ��� ������� �������� ������ � ���������!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_training_request');
      await bot.sendMessage(chatId, 
        '????>? **�������� ������������� ���������**\n\n' +
        '���������� �������� � ����� ����� � �������� ����������:\n\n' +
        '?? **�������:**\n' +
        '� ���� ���������� (���������, ����� �����, ����, ������������)\n' +
        '� ������� ���������� (�������, �������, �����������)\n' +
        '� ������� ���� � ������ ������ �������������\n' +
        '� ��������� ����� �� ����������\n' +
        '� ��������� ������������ (���, ���, ����� �������)\n' +
        '� ����������� �� �������� (���� ����)\n\n' +
        '?? ������� ���� ����������:'
      );
      return;
    }

    if (text.includes('/nutrition_plan')) {
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '?? ��� ������� �������� ������ � ���������!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_nutrition_request');
      await bot.sendMessage(chatId, 
        '?? **�������� ����� �������**\n\n' +
        '��� ����������� ������������� ����� ������� �������:\n\n' +
        '?? **�������� ������:**\n' +
        '� ���� (���������, ����� �����, ����������� ����)\n' +
        '� ���, �������, ����, ������� ���\n' +
        '� ������� ���������� ����������\n' +
        '� ������� ������� ���� �������������\n\n' +
        '??? **������������:**\n' +
        '� �������� ��� ��������������� ���������\n' +
        '� ������ ��� ������� (�����, ����, ��� ������� � �.�.)\n' +
        '� ��������� ��������\n' +
        '� ������ �� �������\n\n' +
        '?? ���������� � ����:'
      );
      return;
    }

    if (text.includes('/composition_analysis')) {
      const subscription = await getActiveSubscription(dbUser.id);
      if (!subscription) {
        await bot.sendMessage(chatId, '?? ��� ������� �������� ������ � ���������!', noSubscriptionKeyboard);
        return;
      }
      
      userStates.set(user.id, 'waiting_for_supplement_info');
      await bot.sendMessage(chatId, 
        '?? **������ ������� �������**\n\n' +
        '��������� ���������� � ������� ��� ���������� �������:\n\n' +
        '?? **������� ��������:**\n' +
        '� ���� �������� � ��������\n' +
        '� �������� ������� � �������������\n' +
        '� ������ ������������ � �����������\n\n' +
        '?? **� �������������:**\n' +
        '� ������������� �����������\n' +
        '� ������������ ���������\n' +
        '� ������� ������������\n' +
        '� ������������ �� ����������\n' +
        '� ��������� �������� �������\n\n' +
        '?? ��������� ���������� � �������:'
      );
      return;
    }

    // ����������� ������ ����������
    if (['?? ������� ����������', '???>? ������', '???+? ����/��������', '????+? ��������������'].includes(text)) {
      await handleWorkoutType(bot, chatId, dbUser.id, text);
      return;
    }

    // ����������� ������� ������ ������� ����������
    if (text === '?? ��������� ������') {
      // �������� ��������� ������� ����������
      activeWorkouts.set(user.id, {
        type: 'strength',
        startTime: Date.now(),
        exercises: []
      });
      
      await bot.sendMessage(
        chatId,
        '?? **������� ���������� ������!**\n\n' +
        '????>? ���������� ���������� �� ���� �� ����������.\n' +
        '��� ������� ���������� �� ������� �������� ���������� ��������, ��� ����������, ���������� � �������� �����������.',
        { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
      );
      return;
    }

    if (text === '? ������� ������') {
      // ������� ������ ������� ����������
      try {
        const duration = 60; // 60 ����� �� ���������
        const calories = 300;
        const intensity = 3; // ������� �������������
        const exercisesCount = 8;
        
        await addWorkout(dbUser.id, 'strength', duration, calories, intensity, exercisesCount, '������� ����������');

        await bot.sendMessage(
          chatId,
          '? ������� ���������� ��������!\n\n' +
          '?? ������ ����������:\n' +
          '? �����������������: 60 �����\n' +
          '?? �������: 300 ����\n' +
          '?? �������������: 3/5\n' +
          '????>? ����������: 8\n\n' +
          '?? � ��������� ��� ���������� ��������� ������ ��� ����� ������� �����!',
          workoutKeyboard
        );
      } catch (error) {
        console.error('������ ������� ������ ����������:', error);
        await bot.sendMessage(
          chatId,
          '? ������ ��� ������ ����������. ���������� �����.',
          workoutKeyboard
        );
      }
      return;
    }

    // === ����������� ��������� ������� ���������� ===
    
    if (text === '? �������� ����������') {
      console.log(`????>? ��������� ���������� ���������� ��� ������������ ${user.id}`);
      if (!activeWorkouts.has(user.id)) {
        console.log(`? � ������������ ${user.id} ��� �������� ����������`);
        await bot.sendMessage(chatId, '? � ��� ��� �������� ����������. ������� ����� ������� ����������.');
        return;
      }
      
      console.log(`? � ������������ ${user.id} ���� �������� ����������, ���������� ����������`);
      await bot.sendMessage(
        chatId,
        '????>? **�������� ����������**\n\n' +
        '�������� �� ���������� ���������� ��� ������� ����:',
        { parse_mode: 'Markdown', ...popularExercisesKeyboard }
      );
      userStates.set(user.id, { action: 'selecting_exercise' });
      return;
    }

    if (text === '?? ���������� ����������') {
      const workout = activeWorkouts.get(user.id);
      if (!workout) {
        await bot.sendMessage(chatId, '? � ��� ��� �������� ����������.');
        return;
      }
      
      await showCurrentWorkout(bot, chatId, workout);
      return;
    }

    if (text === '? ��������� ����������') {
      const workout = activeWorkouts.get(user.id);
      if (!workout) {
        await bot.sendMessage(chatId, '? � ��� ��� �������� ����������.');
        return;
      }
      
      if (workout.exercises.length === 0) {
        await bot.sendMessage(
          chatId,
          '? ������ ��������� ���������� ��� ����������.\n\n�������� ���� �� ���� ���������� ��� �������� ����������.',
          { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
        );
        return;
      }
      
      const moodKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '?? �������', callback_data: 'mood_5' },
              { text: '?? ������', callback_data: 'mood_4' }
            ],
            [
              { text: '?? ���������', callback_data: 'mood_3' },
              { text: '?? �����', callback_data: 'mood_2' }
            ],
            [
              { text: '?? ������', callback_data: 'mood_1' }
            ]
          ]
        }
      };
      
      await bot.sendMessage(
        chatId,
        '?? **������� ���� ���������� ����� ����������:**\n\n' +
        '��� �� ���� ���������� ������?',
        { parse_mode: 'Markdown', ...moodKeyboard }
      );
      userStates.set(user.id, { action: 'waiting_mood_after' });
      return;
    }

    if (text === '? �������� ����������') {
      if (activeWorkouts.has(user.id)) {
        activeWorkouts.delete(user.id);
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '? **���������� ��������**\n\n��� ������ �������.',
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } else {
        await bot.sendMessage(chatId, '? � ��� ��� �������� ����������.');
      }
      return;
    }

    // ��������� ������ ���������� ����������
    if (['????>? ��� ����', '????>? ����������', '????>? �������� ����', '????>? ������������'].includes(text)) {
      const userState = userStates.get(user.id);
      if (userState && userState.action === 'selecting_exercise') {
        // ������� ������ �� �������� ����������
        const exerciseName = text.replace('????>? ', '');
        userStates.set(user.id, { action: 'waiting_sets_count', exerciseName: exerciseName });
        
        await bot.sendMessage(
          chatId,
          `????>? **${exerciseName}**\n\n` +
          `������� �������� �� ���������� �������?\n\n` +
          `?? �������: 3, 4, 5`,
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    if (text === '?? ������ ����������') {
      const userState = userStates.get(user.id);
      if (userState && userState.action === 'selecting_exercise') {
        userStates.set(user.id, { action: 'waiting_custom_exercise' });
        
        await bot.sendMessage(
          chatId,
          '?? **������� �������� ����������**\n\n' +
          '?? �������:\n' +
          '� ��� ��������\n' +
          '� ���� �����\n' +
          '� ������',
          { parse_mode: 'Markdown' }
        );
      }
      return;
    }

    // === ��������� ��������� ���������������� ������ ===
    
    const userState = userStates.get(user.id);
    
    // ��������� ����� ����
    if (userState && userState.action === 'waiting_weight') {
      const weight = parseFloat(text.replace(',', '.'));
      if (isNaN(weight) || weight <= 0 || weight > 300) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ���������� ��� (����� �� 1 �� 300).\n\n?? �������: `75.5`, `68`, `82.3`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        await saveFitnessMetric(dbUser.id, 'weight', weight, 'kg');
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `? **��� �������!**\n\n` +
          `?? ��� ���: **${weight} ��**\n` +
          `?? ����: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `����������� ��� ��������� ��� ������������ ���������!`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } catch (error) {
        await bot.sendMessage(chatId, '? ������ ��� ���������� ����. ���������� ��� ���.');
      }
      return;
    }

    // ��������� ����� �������� ����
    if (userState && userState.action === 'waiting_goal_value') {
      try {
        const goalType = userState.goalType;
        let targetValue = text.trim();
        
        // ��� ���� �������� ���������� �����
        if (goalType === '������� ���') {
          const weight = parseFloat(text.replace(',', '.'));
          if (isNaN(weight) || weight <= 0 || weight > 300) {
            await bot.sendMessage(
              chatId,
              '? ����������, ������� ���������� ������� ��� (����� �� 1 �� 300).\n\n?? ������: `70`',
              { parse_mode: 'Markdown' }
            );
            return;
          }
          targetValue = weight.toString();
        }

        await setUserGoal(dbUser.id, goalType, targetValue);
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `? **���� �����������!**\n\n` +
          `?? ���: **${goalType}**\n` +
          `?? ����: **${targetValue}**\n` +
          `?? ����: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `����� � ���������� ����! ??`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } catch (error) {
        await bot.sendMessage(chatId, '? ������ ��� ���������� ����. ���������� ��� ���.');
      }
      return;
    }

    // ��������� ����� ������������ ����������
    if (userState && userState.action === 'waiting_workout_duration') {
      const duration = parseInt(text);
      if (isNaN(duration) || duration <= 0 || duration > 600) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ���������� ������������ (�� 1 �� 600 �����).\n\n?? �������: `45`, `90`, `30`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      userStates.set(user.id, { 
        action: 'waiting_workout_calories', 
        workoutType: userState.workoutType, 
        duration: duration 
      });
      
      await bot.sendMessage(
        chatId,
        '?? **����������� �������**\n\n' +
        `���: **${userState.workoutType}**\n` +
        `������������: **${duration} ���**\n\n` +
        '������� ������� �� ���������? (�������������)\n\n' +
        '?? �������:\n' +
        '� `300` (300 �������)\n' +
        '� `0` (���� �� ������)',
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ��������� ����� ������� ��� ����������
    if (userState && userState.action === 'waiting_workout_calories') {
      const calories = parseInt(text) || 0;
      if (calories < 0 || calories > 2000) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ���������� ���������� ������� (�� 0 �� 2000).\n\n?? �������: `300`, `450`, `0`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        // ��������� ������ ���������� � ��������� �����������
        const workoutDetails = {
          type: userState.workoutType,
          duration: userState.duration,
          calories: calories,
          averageIntensity: 'medium',
          totalCalories: calories,
          exercises: [] // ��� ������ ��� ����������
        };
        
        await saveDetailedWorkout(
          dbUser.id, 
          'cardio', 
          userState.duration, 
          workoutDetails,
          null, // moodBefore
          null, // moodAfter
          `������ ����������: ${userState.workoutType}` // notes
        );
        userStates.delete(user.id);
        
        await bot.sendMessage(
          chatId,
          `? **���������� ��������!**\n\n` +
          `????>? ���: **${userState.workoutType}**\n` +
          `?? �����: **${userState.duration} ���**\n` +
          `?? �������: **${calories}**\n` +
          `?? ����: ${new Date().toLocaleDateString('ru-RU')}\n\n` +
          `�������� ������! ??`,
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      } catch (error) {
        await bot.sendMessage(chatId, '? ������ ��� ���������� ����������. ���������� ��� ���.');
      }
      return;
    }

    // ��������� ���������� ����
    if (userState && userState.action === 'waiting_weight_update') {
      const weight = parseFloat(text.replace(',', '.'));
      if (isNaN(weight) || weight <= 0 || weight > 300) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ���������� ��� (����� �� 1 �� 300).\n\n?? �������: `75.5`, `68`, `82.3`',
          { parse_mode: 'Markdown' }
        );
        return;
      }

      try {
        const updated = await updateLastWeightRecord(dbUser.id, weight);
        userStates.delete(user.id);
        
        if (updated) {
          await bot.sendMessage(
            chatId,
            `? **��� ��������!**\n\n` +
            `?? ����� ���: **${weight} ��**\n` +
            `?? ����: ${new Date().toLocaleDateString('ru-RU')}`,
            { parse_mode: 'Markdown', ...userDataKeyboard }
          );
        } else {
          await bot.sendMessage(chatId, '? ������ ��� ���������� ����.');
        }
      } catch (error) {
        await bot.sendMessage(chatId, '? ������ ��� ���������� ����. ���������� ��� ���.');
      }
      return;
    }

    // ��������� ������������� ������ �������
    if (userState && userState.action === 'confirm_clear_all') {
      if (text.trim().toUpperCase() === '������� �Ѩ') {
        try {
          await clearAllUserData(dbUser.id);
          userStates.delete(user.id);
          
          await bot.sendMessage(
            chatId,
            `? **��� ������ �������**\n\n` +
            `??? �������:\n` +
            `� ������� ����\n` +
            `� ��� ����\n` +
            `� ������� ����������\n` +
            `� ����������\n\n` +
            `�� ������ ������ ���������� ������ ������.`,
            { parse_mode: 'Markdown', ...userDataKeyboard }
          );
        } catch (error) {
          await bot.sendMessage(chatId, '? ������ ��� �������� ������.');
        }
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '? **�������� ��������**\n\n���� ������ ���������.',
          { parse_mode: 'Markdown', ...userDataKeyboard }
        );
      }
      return;
    }

    // ��������� �������� ����
    if (userState && userState.action === 'delete_goal') {
      if (['?? ������� ���', '?? ����� ����', '?? �������� ����', '???>? �������� ������������', '????>? ��������� ����', '???>? �������� ��������'].includes(text)) {
        const goalType = text.split(' ').slice(1).join(' ').toLowerCase();
        
        try {
          const deleted = await deleteUserGoal(dbUser.id, goalType);
          userStates.delete(user.id);
          
          if (deleted) {
            await bot.sendMessage(
              chatId,
              `? **���� �������**\n\n` +
              `??? ������� ����: **${goalType}**`,
              { parse_mode: 'Markdown', ...userDataKeyboard }
            );
          } else {
            await bot.sendMessage(
              chatId,
              `? ���� "${goalType}" �� �������.`,
              { parse_mode: 'Markdown', ...userDataKeyboard }
            );
          }
        } catch (error) {
          await bot.sendMessage(chatId, '? ������ ��� �������� ����.');
        }
        return;
      }
    }

    // === ����������� ��������� ���������� ===
    
    // ��������� ������ ������������� ����������
    if (userState && userState.action === 'waiting_custom_exercise') {
      if (text.length < 2 || text.length > 50) {
        await bot.sendMessage(
          chatId,
          '? �������� ���������� ������ ���� �� 2 �� 50 ��������.'
        );
        return;
      }

      userStates.set(user.id, { action: 'waiting_sets_count', exerciseName: text });
      
      await bot.sendMessage(
        chatId,
        `????>? **${text}**\n\n` +
        `������� �������� �� ���������� �������?\n\n` +
        `?? �������: 3, 4, 5`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // ��������� ���������� ��������
    if (userState && userState.action === 'waiting_sets_count') {
      const setsCount = parseInt(text);
      if (isNaN(setsCount) || setsCount < 1 || setsCount > 10) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ���������� �������� �� 1 �� 10.'
        );
        return;
      }

      const exercise = {
        name: userState.exerciseName,
        sets: [],
        totalSets: setsCount,
        currentSet: 1
      };

      const workout = activeWorkouts.get(user.id);
      if (workout) {
        workout.exercises.push(exercise);
        
        await bot.sendMessage(
          chatId,
          `????>? **${exercise.name}**\n\n` +
          `?? ������ ${exercise.currentSet} �� ${exercise.totalSets}\n\n` +
          `?? ������� ��� ���������� (� ��):\n\n` +
          `?? �������:\n` +
          `� 50 - ������ 50 ��\n` +
          `� 20 - ������� 20 ��\n` +
          `� 0 - ����������� ��� (������������, ���������)`,
          { parse_mode: 'Markdown' }
        );
        
        userStates.set(user.id, { 
          action: 'waiting_exercise_weight', 
          exerciseIndex: workout.exercises.length - 1 
        });
      }
      return;
    }

    // ��������� ���� ����������
    if (userState && userState.action === 'waiting_exercise_weight') {
      const weight = parseFloat(text);
      if (isNaN(weight) || weight < 0 || weight > 1000) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ��� ���������� �� 0 �� 1000 ��.\n\n' +
          '?? 0 = ����������� ��� (��� ��������������� ����������)'
        );
        return;
      }

      const workout = activeWorkouts.get(user.id);
      const exercise = workout.exercises[userState.exerciseIndex];
      
      // ��������� ��� ��� �������� �������
      exercise.currentWeight = weight;
      
      await bot.sendMessage(
        chatId,
        `????>? **${exercise.name}**\n\n` +
        `?? ������ ${exercise.currentSet} �� ${exercise.totalSets}\n` +
        `?? ����������: ${weight === 0 ? '����������� ���' : weight + ' ��'}\n\n` +
        `������� ���������� ����������:\n\n` +
        `?? �������: 10, 12, 8`,
        { parse_mode: 'Markdown' }
      );

      userStates.set(user.id, { 
        action: 'waiting_reps', 
        exerciseIndex: userState.exerciseIndex 
      });
      return;
    }

    // ��������� ����������
    if (userState && userState.action === 'waiting_reps') {
      const reps = parseInt(text);
      if (isNaN(reps) || reps < 1 || reps > 100) {
        await bot.sendMessage(
          chatId,
          '? ����������, ������� ���������� ���������� �� 1 �� 100.'
        );
        return;
      }

      const workout = activeWorkouts.get(user.id);
      const exercise = workout.exercises[userState.exerciseIndex];
      
      exercise.sets.push({ 
        reps: reps, 
        weight: exercise.currentWeight || 0, 
        notes: null 
      });
      
      if (exercise.currentSet < exercise.totalSets) {
        exercise.currentSet++;
        
        await bot.sendMessage(
          chatId,
          `? **������ ${exercise.currentSet - 1}: ${reps} ����������** ${exercise.currentWeight === 0 ? '(����������� ���)' : '(' + exercise.currentWeight + ' ��)'}\n\n` +
          `????>? **${exercise.name}**\n` +
          `?? ������ ${exercise.currentSet} �� ${exercise.totalSets}\n\n` +
          `?? ������� ��� ���������� (� ��):`,
          { parse_mode: 'Markdown' }
        );

        userStates.set(user.id, { 
          action: 'waiting_exercise_weight', 
          exerciseIndex: userState.exerciseIndex 
        });
      } else {
        await bot.sendMessage(
          chatId,
          `? **���������� "${exercise.name}" ���������!**\n\n` +
          `?? ���������:\n` +
          exercise.sets.map((set, i) => 
            `������ ${i + 1}: ${set.reps} ���������� ${set.weight === 0 ? '(����������� ���)' : '(' + set.weight + ' ��)'}`
          ).join('\n') + '\n\n' +
          `?? ������ �������� ����������� � ����� ����������?\n` +
          `(��������: "�����", "�� ������", "������")\n\n` +
          `��� ������� "����������" ����� ����������.`,
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: '? ����������' }],
                [{ text: '? �������� ����������' }, { text: '? ��������� ����������' }]
              ],
              resize_keyboard: true,
              one_time_keyboard: false
            }
          }
        );
        
        userStates.set(user.id, { 
          action: 'waiting_exercise_notes', 
          exerciseIndex: userState.exerciseIndex 
        });
      }
      return;
    }

    // ��������� ������������ � ����������
    if (userState && userState.action === 'waiting_exercise_notes') {
      const workout = activeWorkouts.get(user.id);
      const exercise = workout.exercises[userState.exerciseIndex];
      
      if (text !== '? ����������') {
        exercise.notes = text;
        await bot.sendMessage(
          chatId,
          `? **����������� ��������:** "${text}"\n\n` +
          `����������� ����������:`,
          { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
        );
      } else {
        await bot.sendMessage(
          chatId,
          `? **���������� ���������**\n\n` +
          `����������� ����������:`,
          { parse_mode: 'Markdown', ...detailedWorkoutKeyboard }
        );
      }
      
      userStates.delete(user.id);
      return;
    }

    // ��������� ���������� ����� ����������
    if (userState && userState.action === 'waiting_mood_after') {
      const moodValue = parseMoodValue(text);
      const moodKeyboard = {
        reply_markup: {
          inline_keyboard: [
            [
              { text: '?? �������', callback_data: 'mood_5' },
              { text: '?? ������', callback_data: 'mood_4' }
            ],
            [
              { text: '?? ���������', callback_data: 'mood_3' },
              { text: '?? �����', callback_data: 'mood_2' }
            ],
            [
              { text: '?? ������', callback_data: 'mood_1' }
            ]
          ]
        }
      };
      
      if (moodValue === null) {
        await bot.sendMessage(
          chatId,
          '? ����������, �������� ���������� �� ������������ ���������.',
          { parse_mode: 'Markdown', ...moodKeyboard }
        );
        return;
      }

      const workout = activeWorkouts.get(user.id);
      if (workout) {
        workout.moodAfter = moodValue;
        
        await bot.sendMessage(
          chatId,
          '?? **��������� �����������**\n\n' +
          '�������� ����� ����������� � ����������:\n' +
          '� ��� ������ ����������?\n' +
          '� ��� ���������� ������?\n' +
          '� ��� ����� ��������?\n\n' +
          '��� ������� "����������":',
          { 
            parse_mode: 'Markdown',
            reply_markup: {
              keyboard: [
                [{ text: '? ����������' }]
              ],
              resize_keyboard: true,
              one_time_keyboard: true
            }
          }
        );
        
        userStates.set(user.id, { action: 'waiting_workout_notes' });
      }
      return;
    }

    // ��������� ����� ������������ � ����������
    if (userState && userState.action === 'waiting_workout_notes') {
      const workout = activeWorkouts.get(user.id);
      if (workout) {
        const workoutNotes = text === '? ����������' ? null : text;
        
        // ��������� ���������� � ���� ������
        try {
          const workoutDetails = {
            exercises: workout.exercises,
            totalExercises: workout.exercises.length,
            totalSets: workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0),
            totalReps: workout.exercises.reduce((sum, ex) => 
              sum + ex.sets.reduce((setSum, set) => setSum + set.reps, 0), 0
            ),
            totalWeight: workout.exercises.reduce((sum, ex) => 
              sum + ex.sets.reduce((setSum, set) => setSum + (set.weight * set.reps), 0), 0
            ),
            averageIntensity: 'medium',
            duration: Math.round((new Date() - workout.startTime) / (1000 * 60)) // � �������
          };

          await saveDetailedWorkout(
            dbUser.id,
            'strength',
            workoutDetails.duration,
            workoutDetails,
            workout.moodBefore,
            workout.moodAfter,
            workoutNotes
          );

          // ������� �������� ����������
          activeWorkouts.delete(user.id);
          userStates.delete(user.id);

          await bot.sendMessage(
            chatId,
            `?? **���������� ���������!**\n\n` +
            `?? **����������:**\n` +
            `� ����������: ${workoutDetails.totalExercises}\n` +
            `� ��������: ${workoutDetails.totalSets}\n` +
            `� ����������: ${workoutDetails.totalReps}\n` +
            `� ������� � �����������: ${workoutDetails.totalWeight} ��\n` +
            `� �����: ${workoutDetails.duration} ���\n` +
            `� ����������: ${getMoodEmoji(workout.moodBefore)} > ${getMoodEmoji(workout.moodAfter)}\n\n` +
            `�������� ������! ??`,
            { parse_mode: 'Markdown', ...userDataKeyboard }
          );

        } catch (error) {
          await bot.sendMessage(chatId, '? ������ ��� ���������� ����������. ���������� ��� ���.');
          console.error('������ ���������� ����������:', error);
        }
      }
      return;
    }

    // ���� ������������ ������� ����� ���� ��� ������������
    if (userStates.get(user.id) === 'waiting_for_research_topic') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '?? �������� �������� ������', 'deep_research');
      return;
    }

    // ���� ������������ ������� ����� ������ ��� ������������� ���������
    if (userStates.get(user.id) === 'waiting_for_training_request') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '????>? ������ ������������ ��������� ����������', 'training_program');
      return;
    }

    // ���� ������������ ������� ����� ������ ��� ����� �������
    if (userStates.get(user.id) === 'waiting_for_nutrition_request') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '?? ��������� �������������� ���� �������', 'nutrition_plan');
      return;
    }

    // ���� ������������ ������� ����� ���������� � �������
    if (userStates.get(user.id) === 'waiting_for_supplement_info') {
      await handleSpecialAIRequest(bot, chatId, user, dbUser, text, '?? ���������� ������ �������', 'composition_analysis');
      return;
    }

    // ���� ������������ � ������ ���� � ��
    if (userStates.get(user.id) === 'chatting_with_ai') {
      // ��������� ����������� ������ �������
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '? � ��� ����������� ������� � ��-�������.\n\n' +
          '?? ���������� �������: 0/7\n' +
          '?? �������� �������� ��� �����������!',
          noSubscriptionKeyboard
        );
        return;
      }

      // ���������� ������ � Coze
      await bot.sendChatAction(chatId, 'typing');
      
      // ���������� ��������� � ���, ��� ��� ������
      const thinkingMessage = await bot.sendMessage(chatId, '?? ���������� ��� ������...');
      
      // ���������, ���� �� �������� �� ����������� workflow
      const workflowContext = userWorkflowContext.get(user.id);
      let messageWithContext = text;
      
      if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 �����
        messageWithContext = `�������� ����������� �������:
��� �������: ${workflowContext.type}
������ ������������: "${workflowContext.query}"
���������� ���������: "${workflowContext.result.substring(0, 1000)}..."

����� ������ ������������: ${text}`;
        
        console.log(`?? �������� �������� workflow � ��������� ��� ������������ ${user.id}`);
      }
      
      const systemPrompt = `�� ������� � ������� �������, ���������� ��� ��������� ����������: �������������, ��������, ��������, ��������, ������������ � ������ ������. �� ������� ������ � ����������������������� ������, ���������� ������ ��������� ������ � ������� ������� � ������.

�����������:
- ������� � ��������� �������
- ������� ������������� �� ������� �����
- �� ������������ ����������� ������, ��������� �� ����� ������� � �������
- �� �������� ����, �� ��������� � �������� � ���������
- �������� �������������� ����������� � ����������� ������������ ��� ����������� ������������
- �� ������������ �� ������ ������������� ���������
- �� � ���� ������ �� ������, ����� ������� ��������� �������� �� ���������, � ����� �� �������� ��������� ������ ������ ����� ������, ����� ���������� �� ����� ������� ����������, ������������ ������������ �����`;
      
      const aiResponse = await runDeepSeekChat(user.access_token, messageWithContext, user.id, systemPrompt);
      
      // ������� ��������� "������"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // ���������� ������ ��������
      }
      
      if (aiResponse.success) {
        // ��������� ������
        if (requestStatus.type === 'free') {
          await useFreeRequest(dbUser.id);
          const freeRequests = await getUserFreeRequests(dbUser.id);
          await bot.sendMessage(
            chatId, 
            aiResponse.message + `\n\n?? ���������� �������� ��������: ${freeRequests.remaining}/7`
          );
        } else if (requestStatus.type === 'subscription') {
          await incrementRequestUsage(dbUser.id);
          await bot.sendMessage(chatId, aiResponse.message);
        } else {
          await bot.sendMessage(chatId, aiResponse.message);
        }
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }

    // === ����������� ������������� �������� ===
    
    // ��������� ������������� �������� ���� ����������
    if (userStates.get(user.id) === 'waiting_confirm_delete_all_workouts') {
      if (text === '������� ��� ����������') {
        userStates.delete(user.id);
        await processDeleteAllWorkouts(bot, chatId, dbUser.id);
        return;
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '? �������� ��������.\n\n��� ������������� ����� ���� �������� �����: `������� ��� ����������`',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
        return;
      }
    }
    
    // ��������� ������������� �������� ���� ������� ����
    if (userStates.get(user.id) === 'waiting_confirm_delete_all_weights') {
      if (text === '������� ��� ����') {
        userStates.delete(user.id);
        await processDeleteAllWeights(bot, chatId, dbUser.id);
        return;
      } else {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '? �������� ��������.\n\n��� ������������� ����� ���� �������� �����: `������� ��� ����`',
          { parse_mode: 'Markdown', ...mainKeyboard }
        );
        return;
      }
    }

    // ������� �������� � ������� ����
    if (text === '/menu') {
      userStates.delete(user.id);
      await bot.sendMessage(
        chatId,
        '?? ������� ����',
        mainKeyboard
      );
      return;
    }

    // ������� ������ ������� � ��
    if (text === '/reset' || text === '/�����') {
      // ���������� ��������� ������������
      userStates.delete(user.id);
      
      // �������� ����� ������� ������������
      const accessToken = await getUserAccessToken(dbUser.id);
      clearConversation(dbUser.id);
      
      await bot.sendMessage(
        chatId,
        '?? ������ � �� �������! ������ ������ ������ ����� ������� � ������� �����.\n\n?? ��� ���������� ������� � �������� �������.',
        mainKeyboard
      );
      return;
    }

    // === �������� ��������� ������������ ===
    const currentState = userStates.get(user.id);
    
    // ��������� ���������, ������� ������� ���� ������������ (���, ���� � �.�.)
    if (currentState) {
      await handleUserState(bot, chatId, user, dbUser, text, currentState);
      return;
    }
    
    // === �������� ������������� WORKFLOW ===
    // ���������, ���� �� �������� ������������� workflow
    const activeWorkflow = userInteractiveWorkflow.get(user.id);
    if (activeWorkflow && (Date.now() - activeWorkflow.timestamp) < 600000) { // 10 �����
      console.log(`?? ������������ ${user.id} �������� �� ������������� workflow: ${activeWorkflow.type}`);
      
      // ��� ����� ������������ �� ������������� workflow
      await handleInteractiveWorkflowResponse(bot, chatId, user, dbUser, text, activeWorkflow);
      return;
    }
    
    // === ��������� ������ ��-������� ===
    // ������ ������ "?? ��-������" ������ ������������ AI, � ��������� 'chatting_with_ai' �������������� ����
    if (text === '?? ��-������') {
      await handleAITrainerConversation(bot, chatId, user, dbUser, text);
      return;
    }
    
    // === �������� �������� ��� AI ������� ===
    const subscription = await getActiveSubscription(dbUser.id);
    console.log(`User ${user.id} subscription status:`, subscription ? 'active' : 'none');

    // === ��������� WORKFLOW ������ ===
    // ����������� ��������� ��� ������ Coze (������������ � /)
    if (text.startsWith('/')) {
      console.log(`?? ������� Coze �� ������������ ${user.id}:`, text);
      
      if (!subscription) {
        await bot.sendMessage(
          chatId,
          '? **��-����������� �������� ������ � ���������**\n\n' +
          '? �������� �������� ��� ������� � ����������� ������������!',
          { parse_mode: 'Markdown', ...noSubscriptionKeyboard }
        );
        return;
      }
      
      await handleWorkflowCommands(bot, chatId, user, dbUser, text);
      return;
    }
    
    // === ��������� ������ ��-������� ===
    // ���� ������������ ��������� � ������ ������� � ��
    if (currentState === 'chatting_with_ai') {
      // ��������� ����������� ������ �������
      const requestStatus = await canUserMakeRequest(dbUser.id);
      
      if (!requestStatus.canMake) {
        userStates.delete(user.id);
        await bot.sendMessage(
          chatId,
          '? � ��� ����������� ������� � ��-�������.\n\n' +
          '?? ���������� �������: 0/7\n' +
          '?? �������� �������� ��� �����������!',
          noSubscriptionKeyboard
        );
        return;
      }

      // ���������� ������ � Coze
      await bot.sendChatAction(chatId, 'typing');
      
      // ���������� ��������� � ���, ��� ��� ������
      const thinkingMessage = await bot.sendMessage(chatId, '?? ���������� ��� ������...');
      
      // ���������, ���� �� �������� �� ����������� workflow
      const workflowContext = userWorkflowContext.get(user.id);
      let messageWithContext = text;
      
      if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 �����
        messageWithContext = `�������� ����������� �������:
��� �������: ${workflowContext.type}
������ ������������: "${workflowContext.query}"
���������� ���������: "${workflowContext.result.substring(0, 1000)}..."

����� ������ ������������: ${text}`;
        
        console.log(`?? �������� �������� workflow � ��������� ��� ������������ ${user.id}`);
      }
      
      const aiResponse = await runDeepSeekChat(user.access_token, messageWithContext, user.id, '������� ��� ������������ ������?������: ���� ����������, ������������ ������ ��������, ������� ������ ����.');
      
      // ������� ��������� "������"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // ���������� ������ ��������
      }
      
      if (aiResponse.success) {
        // ��������� ������
        if (requestStatus.type === 'free') {
          await useFreeRequest(dbUser.id);
          const freeRequests = await getUserFreeRequests(dbUser.id);
          await bot.sendMessage(
            chatId, 
            aiResponse.message + `\n\n?? ���������� �������� ��������: ${freeRequests.remaining}/7`
          );
        } else if (requestStatus.type === 'subscription') {
          await incrementRequestUsage(dbUser.id);
          await bot.sendMessage(chatId, aiResponse.message);
        } else {
          await bot.sendMessage(chatId, aiResponse.message);
        }
      } else {
        await bot.sendMessage(chatId, aiResponse.message);
      }
      return;
    }
    
    // === ���������� ������� � WORKFLOW ===
    // ���������, ���� �� �������� ���������� workflow ��� ���������� ��������
    const workflowContext = userWorkflowContext.get(user.id);
    if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 �����
      console.log(`?? ��������� �������� workflow ��� ������������ ${user.id}, ������������ ���������� ������`);
      
      // ��������� ������ ��������
      const requestStatus = await canUserMakeRequest(dbUser.id);
      if (!requestStatus.canMake) {
        if (requestStatus.type === 'free') {
          await bot.sendMessage(
            chatId, 
            `?? �������� ����� ���������� �������� (${requestStatus.used}/${requestStatus.limit}).\n\n?? �������� �������� ��� ��������������� ������� � ��-�������!`,
            subscriptionKeyboard
          );
        } else {
          await bot.sendMessage(
            chatId, 
            `?? �������� ����� �������� (${requestStatus.used}/${requestStatus.limit}).\n\n?? �������� �������� ��� ����������� ������!`,
            subscriptionKeyboard
          );
        }
        return;
      }

      // ���������� ���������� ������ � Coze API � ����������
      await bot.sendChatAction(chatId, 'typing');
      const thinkingMessage = await bot.sendMessage(chatId, '?? ���������� ��� ������ � ������ ����������� ���������...');

      // ��������� ��������� � ����������
      const messageWithContext = `�������� ����������� �������:
��� �������: ${workflowContext.type}
������ ������������: "${workflowContext.userQuestion}"
���������� ���������: "${workflowContext.workflowResponse.substring(0, 1500)}..."

���������� ������ ������������: ${text}

����������, ������ �� ���������� ������ � ������ ��������� ����������� �������.`;

      console.log(`?? ���������� ���������� ������ � Coze API ��� ������������ ${user.id}`);
      
      const aiResponse = await runDeepSeekChat(user.access_token, messageWithContext, user.id, '������� ��� ������������ ������?������ � ������� �� �������: ���� ����������, ������������ ������ ��������, ��������� �������� ����������� �������.');

      // ������� ��������� "������"
      try {
        await bot.deleteMessage(chatId, thinkingMessage.message_id);
      } catch (deleteError) {
        // ���������� ������ ��������
      }

      if (aiResponse.success) {
        // ��������� timestamp ��������� ��� ����������� ���������� ���������
        workflowContext.timestamp = Date.now();
        
        // ��������� ������
        if (requestStatus.type === 'free') {
          await useFreeRequest(dbUser.id);
          const freeRequests = await getUserFreeRequests(dbUser.id);
          await bot.sendMessage(
            chatId, 
            aiResponse.message + `\n\n?? ���������� �������� ��������: ${freeRequests.remaining}/7`
          );
        } else if (requestStatus.type === 'subscription') {
          await incrementRequestUsage(dbUser.id);
          await bot.sendMessage(chatId, aiResponse.message);
        } else {
          await bot.sendMessage(chatId, aiResponse.message);
        }
      } else {
        await bot.sendMessage(chatId, '? ��������, �� ������� �������� ����� �� ��. ���������� �����.');
      }
      return;
    }
    
    // === ������������ ��������� ===
    // ���� ������������ �� � ������ ��-������� � ��� �� ������/�������
    console.log(`User ${user.id} sent unrecognized message, showing main menu`);
    await bot.sendMessage(
      chatId,
      '?? �� ����� ��� ������. ����������� ������ ���� ��� ���������.\n\n' +
      '?? ��� ������� � ��-�������� ������� "?? ��-������"',
      mainKeyboard
    );

  } catch (error) {
    console.error('������ ��������� ���������:', error);
    await bot.sendMessage(chatId, '��������� ������. ���������� ��� ���.');
  }
}

async function handleCallbackQuery(bot, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;
  const user = callbackQuery.from;

  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    const dbUser = await getUserByTelegramId(user.id);

    switch (data) {
      case 'accept_agreement':
        // ��������� ������ �������� � ���� ������
        await updateUserAgreement(user.id, true);
        
        // ������� ����������� ��������� ��� ����������
        await bot.editMessageText(
          '? **������� �� �������� �������!**\n\n' +
          '?? ����� ���������� � FitnessBotAI!\n\n' +
          '?? � ��� ������ ��-������, ������� ������ ��� ������� ����� ������-�����!\n\n' +
          '? ��� � ����:\n' +
          '� ���������� ������������ ��������� ����������\n' +
          '� ������ ������ �� �������\n' +
          '� ����������� ��������\n' +
          '� ������������ �� ���������� �����������\n\n' +
          '?? ��� ������� ������� �� ���� �������� �������� ��������!\n\n' +
          '?? ������ ��� ���� � ��������� �����?',
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        
        // ����� ���������� ����� ��������� � �������� �����������
        await bot.sendMessage(
          chatId,
          '����������� ���� ���� ��� ���������:',
          mainKeyboard
        );
        break;

      case 'decline_agreement':
        await bot.editMessageText(
          '? **������� �� �������**\n\n' +
          '� ���������, ��� �������� ����������������� ���������� �� �� ����� ������������ ��� ������ � ������ �������.\n\n' +
          '���� �� �����������, ����������� ������� /start ��� ���������� ������������ � ���������.',
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown'
          }
        );
        break;

      case 'show_subscription_plans':
        await bot.editMessageText(
          '?? �������� ���� ��������:\n\n?? �������� �������� - 999?\n� ������ ������ � ��-�������\n� ������������ ��������� ����������\n� ������ �� �������\n\n?? ������� �������� - 9990?\n� ��� �� �������� ��������\n� ������ 17%\n� ������������ ���������',
          {
            chat_id: chatId,
            message_id: messageId,
            ...subscriptionKeyboard
          }
        );
        break;

      case 'buy_basic':
        await showPaymentConfirmation(bot, chatId, messageId, 'basic');
        break;

      case 'buy_standard':
        await showPaymentConfirmation(bot, chatId, messageId, 'standard');
        break;

      case 'buy_premium':
        await showPaymentConfirmation(bot, chatId, messageId, 'premium');
        break;

      case 'confirm_payment_basic':
        await processPayment(bot, chatId, messageId, user.id, 'basic');
        break;

      case 'confirm_payment_standard':
        await processPayment(bot, chatId, messageId, user.id, 'standard');
        break;

      case 'confirm_payment_premium':
        await processPayment(bot, chatId, messageId, user.id, 'premium');
        break;

      case 'subscription_status':
        await showSubscriptionStatus(bot, chatId, messageId, dbUser.id);
        break;

      case 'extend_subscription':
        await bot.editMessageText(
          '?? ��������� ��������\n\n�������� ����:',
          {
            chat_id: chatId,
            message_id: messageId,
            ...subscriptionKeyboard
          }
        );
        break;

      case 'cancel_payment':
        await bot.editMessageText(
          '? ������ ��������.\n\n�� ������ �������� �������� � ����� �����.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...noSubscriptionKeyboard
          }
        );
        break;

      case 'back_to_main':
        await bot.deleteMessage(chatId, messageId);
        await bot.sendMessage(chatId, '?? ������� ����', mainKeyboard);
        break;

      case 'help_ai':
        await bot.editMessageText(
          '?? ��� ������������ ��-��������:\n\n1. ������� "��� � ��-��������"\n2. ������� ����� ������ � �������\n3. �������� ������������ �����\n\n?? ������� ��������:\n� "������� ��������� ���������� ��� �������"\n� "��� ���� ����� �����������?"\n� "��� �������� ����� ����?"',
          {
            chat_id: chatId,
            message_id: messageId,
            ...helpKeyboard
          }
        );
        break;

      case 'help_payment':
        await bot.editMessageText(
          '?? ���������� �� ������:\n\n� ������ ����� ������ (���������)\n� �������������� ��� ���������� �����\n� �������� ������������ �������������\n� �������� ������� � ������� 14 ����\n\n?? �������� � �������? ���������� � ���������.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...helpKeyboard
          }
        );
        break;

      case 'help_support':
        await bot.editMessageText(
          '?? ���������:\n\n?? Email: support@fitnessbot.ai\n?? Telegram: @fitness_support\n? ����� ������: 9:00-21:00 ���\n\n?? ������ �������� � ������� 2-4 �����.',
          {
            chat_id: chatId,
            message_id: messageId,
            ...helpKeyboard
          }
        );
        break;

      case 'mood_1':
      case 'mood_2':
      case 'mood_3':
      case 'mood_4':
      case 'mood_5':
        const moodValue = parseInt(data.split('_')[1]);
        const userState = userStates.get(user.id);
        
        if (userState && userState.action === 'waiting_mood_after') {
          const workout = activeWorkouts.get(user.id);
          if (workout) {
            workout.moodAfter = moodValue;
            
            await bot.editMessageText(
              '?? **��������� �����������**\n\n' +
              '�������� ����� ����������� � ����������:\n' +
              '� ��� ������ ����������?\n' +
              '� ����� ���������� ����������� ������ �����?\n' +
              '� ��� �� �� ������ �������� � ��������� ���?\n\n' +
              '?? �������� ��� ����������� ��� ������� "����������":',
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown',
                reply_markup: {
                  inline_keyboard: [
                    [{ text: '?? ����������', callback_data: 'skip_comment' }]
                  ]
                }
              }
            );
            userStates.set(user.id, { action: 'waiting_workout_notes' });
          }
        }
        break;

      case 'skip_comment':
        const skipUserState = userStates.get(user.id);
        if (skipUserState && skipUserState.action === 'waiting_workout_notes') {
          const workout = activeWorkouts.get(user.id);
          if (workout) {
            // ��������� ���������� ��� �����������
            await completeWorkout(user.id, workout);
            activeWorkouts.delete(user.id);
            userStates.delete(user.id);
            
            await bot.editMessageText(
              '? **���������� ���������!**\n\n' +
              '?? �������� ������! ���� ���������� ������� ��������.\n\n' +
              '?? �� ������ ���������� ���������� � ������� "?? ���������".',
              {
                chat_id: chatId,
                message_id: messageId,
                parse_mode: 'Markdown'
              }
            );
            
            // ���������� ������� ����
            setTimeout(async () => {
              await bot.sendMessage(chatId, '?? ������� ����:', mainKeyboard);
            }, 2000);
          }
        }
        break;

      default:
        console.log('����������� callback:', data);
    }

  } catch (error) {
    console.error('������ ��������� callback:', error);
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '��������� ������. ���������� ��� ���.',
      show_alert: true
    });
  }
}

async function showSubscriptionMenu(bot, chatId, userId) {
  const subscription = await getActiveSubscription(userId);
  
  if (subscription) {
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    
    const planNames = {
      'basic': '������� (100 ��������)',
      'standard': '����������� (300 ��������)', 
      'premium': '������� (600 ��������)'
    };
    const remaining = subscription.requests_limit - subscription.requests_used;
    const message = `?? ���� �������� �������!\n\n?? ����: ${planNames[subscription.plan_type] || subscription.plan_type}\n?? �������: ${subscription.requests_used}/${subscription.requests_limit} (��������: ${remaining})\n? �� ���������: ${daysLeft} ����\n?? ������: �������`;
    
    await bot.sendMessage(chatId, message, manageSubscriptionKeyboard);
  } else {
    await bot.sendMessage(
      chatId,
      '?? � ��� ��� �������� ��������\n\n�������� ���� ������ �:\n� ������������� ��-�������\n� ���������� ����������\n� ������� �� �������\n� ������������ ���������',
      noSubscriptionKeyboard
    );
  }
}

async function showUserProfile(bot, chatId, user) {
  const subscription = await getActiveSubscription(user.id);
  const freeRequests = await getUserFreeRequests(user.id);
  
  let message = `?? ��� �������\n\n`;
  message += `?? ���: ${user.first_name || '�� �������'}\n`;
  message += `?? ID: ${user.telegram_id}\n`;
  message += `?? �����������: ${new Date(user.created_at).toLocaleDateString('ru-RU')}\n\n`;
  
  // ���������� ���������� �������
  message += `?? ���������� �������: ${freeRequests.used}/${freeRequests.total} (��������: ${freeRequests.remaining})\n\n`;
  
  if (subscription) {
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    const planNames = {
      'basic': '������� (100 ��������)',
      'standard': '����������� (300 ��������)', 
      'premium': '������� (600 ��������)'
    };
    const remaining = subscription.requests_limit - subscription.requests_used;
    message += `?? ��������: �������\n`;
    message += `?? ����: ${planNames[subscription.plan_type] || subscription.plan_type}\n`;
    message += `?? �������: ${subscription.requests_used}/${subscription.requests_limit} (��������: ${remaining})\n`;
    message += `? �������� ����: ${daysLeft}`;
  } else {
    message += `?? ��������: �� �������`;
  }

  await bot.sendMessage(chatId, message, mainKeyboard);
}

async function showPaymentConfirmation(bot, chatId, messageId, planType) {
  const plans = {
    'basic': { price: '150?', requests: '100 ��������', name: '�������' },
    'standard': { price: '300?', requests: '300 ��������', name: '�����������' },
    'premium': { price: '450?', requests: '600 ��������', name: '�������' }
  };
  
  const plan = plans[planType];
  const message = `?? ������������� ������\n\n?? ����: ${plan.name}\n?? �����: ${plan.requests} � �����\n?? � ������: ${plan.price}\n\n? ����� ������ �������� ������������ �������������.`;
  
  await bot.editMessageText(message, {
    chat_id: chatId,
    message_id: messageId,
    ...confirmPaymentKeyboard(planType)
  });
}

async function processPayment(bot, chatId, messageId, telegramId, planType) {
  try {
    await bot.editMessageText('? ������� ������ ��� ������...', {
      chat_id: chatId,
      message_id: messageId
    });

    const paymentResult = await createSubscriptionPayment(telegramId, planType);
    
    if (paymentResult.success) {
      const plans = {
        'basic': { price: '150?', requests: '100 ��������', name: '�������' },
        'standard': { price: '300?', requests: '300 ��������', name: '�����������' },
        'premium': { price: '450?', requests: '600 ��������', name: '�������' }
      };
      const plan = plans[planType];
      
      await bot.editMessageText(
        `?? ������ ��������\n\n?? ����: ${plan.name}\n?? �����: ${plan.requests} � �����\n?? �����: ${plan.price}\n\n?? ������ �������� ����� ���������� ������ ������.\n\n?? ������� ������ ���� ��� �������� � ������:`,
        {
          chat_id: chatId,
          message_id: messageId,
          ...paymentLinkKeyboard(paymentResult.paymentUrl)
        }
      );
    } else {
      await bot.editMessageText(
        `? ������ �������� �������: ${paymentResult.error}\n\n���������� ��� ��� ��� ���������� � ���������.`,
        {
          chat_id: chatId,
          message_id: messageId,
          ...subscriptionKeyboard
        }
      );
    }
  } catch (error) {
    console.error('������ ��������� �������:', error);
    await bot.editMessageText(
      '? ��������� ������ ��� �������� �������. ���������� ��� ���.',
      {
        chat_id: chatId,
        message_id: messageId,
        ...subscriptionKeyboard
      }
    );
  }
}

async function showSubscriptionStatus(bot, chatId, messageId, userId) {
  const subscription = await getActiveSubscription(userId);
  
  if (subscription) {
    const startDate = new Date(subscription.start_date);
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24));
    
    const planNames = {
      'basic': '������� (100 ��������)',
      'standard': '����������� (300 ��������)', 
      'premium': '������� (600 ��������)'
    };
    
    const remaining = subscription.requests_limit - subscription.requests_used;
    const message = `?? ������ ��������\n\n? ������: �������\n?? ����: ${planNames[subscription.plan_type] || subscription.plan_type}\n?? ������������ ��������: ${subscription.requests_used}/${subscription.requests_limit}\n?? �������� ��������: ${remaining}\n?? ������: ${startDate.toLocaleDateString('ru-RU')}\n?? ���������: ${endDate.toLocaleDateString('ru-RU')}\n? �������� ����: ${daysLeft}\n?? �����: ${subscription.amount}?`;
    
    if (messageId) {
      // ���� ���� messageId, ����������� ������������ ���������
      await bot.editMessageText(message, {
        chat_id: chatId,
        message_id: messageId,
        ...manageSubscriptionKeyboard
      });
    } else {
      // ���� ��� messageId, ���������� ����� ���������
      await bot.sendMessage(chatId, message, manageSubscriptionKeyboard);
    }
  } else {
    const noSubMessage = '? � ��� ��� �������� ��������';
    
    if (messageId) {
      // ���� ���� messageId, ����������� ������������ ���������
      await bot.editMessageText(noSubMessage, {
        chat_id: chatId,
        message_id: messageId,
        ...noSubscriptionKeyboard
      });
    } else {
      // ���� ��� messageId, ���������� ����� ���������
      await bot.sendMessage(chatId, noSubMessage, noSubscriptionKeyboard);
    }
  }
}

// ����������� ���������
async function handleWeightChart(bot, chatId, userId) {
  try {
    await bot.sendMessage(chatId, '? ��������� ������ ����...');
    
    console.log(`������ ������ ���� ��� ������������ ${userId}`);
    const metrics = await getUserMetrics(userId, 'weight');
    console.log(`������� ������ ����: ${metrics.length}`);
    
    if (metrics.length === 0) {
      await bot.sendMessage(
        chatId,
        '?? � ��� ���� ��� ������ � ����.\n\n��� ��������� ������� �������� ������ ����� ������� ��-������� ��� �������� ����������.',
        analyticsKeyboard
      );
      return;
    }

    console.log(`��������� ������ ��� ������:`, metrics.slice(0, 2));
    const chartPath = await generateWeightChart(metrics, userId);
    console.log(`���� � �������: ${chartPath}`);
    
    if (!chartPath) {
      await bot.sendMessage(
        chatId,
        '? ������ ��� ��������� �������. ���������� �����.',
        analyticsKeyboard
      );
      return;
    }

    await bot.sendPhoto(chatId, chartPath, {
      caption: '?? ��� ������ ��������� ����\n\n������ �� ��������� ������ � �������.',
      ...analyticsKeyboard
    });
    
  } catch (error) {
    console.error('������ ��������� ������� ����:', error);
    await bot.sendMessage(
      chatId,
      '? ������ ��� ��������� �������. ���������� �����.',
      analyticsKeyboard
    );
  }
}

async function handleWorkoutChart(bot, chatId, userId) {
  try {
    await bot.sendMessage(chatId, '? ��������� ������ ����������...');
    
    const workouts = await getUserWorkouts(userId);
    
    if (workouts.length === 0) {
      await bot.sendMessage(
        chatId,
        '????>? � ��� ���� ��� ���������� ����������.\n\n����������� ������ "�������� ����������" ��� ���������� ������.',
        analyticsKeyboard
      );
      return;
    }

    const chartPath = await generateWorkoutChart(workouts, userId);
    
    await bot.sendPhoto(chatId, chartPath, {
      caption: '????>? ��� ������ ����������\n\n������������� ���������� �� ����� �� ��������� ������.',
      ...analyticsKeyboard
    });
    
  } catch (error) {
    console.error('������ ��������� ������� ����������:', error);
    await bot.sendMessage(
      chatId,
      '? ������ ��� ��������� �������. ���������� �����.',
      analyticsKeyboard
    );
  }
}

async function handleProgressReport(bot, chatId, userId) {
  try {
    await bot.sendMessage(chatId, '? ��������� ����� � ���������...');
    
    const metrics = await getUserMetrics(userId);
    const workouts = await getUserWorkouts(userId);
    
    if (metrics.length === 0 && workouts.length === 0) {
      await bot.sendMessage(
        chatId,
        '?? � ��� ���� ��� ������ ��� ������.\n\n�������� ������ � ���� � ����������� ��� ��������� ������� ������.',
        analyticsKeyboard
      );
      return;
    }

    const chartPath = await generateProgressChart(metrics, workouts, userId);
    const textReport = await generateTextReport(userId);
    
    await bot.sendPhoto(chatId, chartPath, {
      caption: `?? ����� ����� � ���������\n\n${textReport}`,
      ...analyticsKeyboard
    });
    
  } catch (error) {
    console.error('������ ��������� ������:', error);
    await bot.sendMessage(
      chatId,
      '? ������ ��� ��������� ������. ���������� �����.',
      analyticsKeyboard
    );
  }
}

async function handleAchievements(bot, chatId, userId) {
  try {
    const achievements = await getUserAchievements(userId);
    
    if (achievements.length === 0) {
      await bot.sendMessage(
        chatId,
        '?? � ��� ���� ��� ����������.\n\n����������� ������������� � ������� �� ���������� - ���������� �� �������� ���� �����!',
        analyticsKeyboard
      );
      return;
    }

    let message = '?? ���� ����������:\n\n';
    achievements.forEach((achievement, index) => {
      const date = new Date(achievement.earned_date).toLocaleDateString('ru-RU');
      message += `${index + 1}. ${achievement.title}\n`;
      message += `   ?? ${achievement.description}\n`;
      message += `   ?? ��������: ${date}\n\n`;
    });

    await bot.sendMessage(chatId, message, analyticsKeyboard);
    
  } catch (error) {
    console.error('������ ��������� ����������:', error);
    await bot.sendMessage(
      chatId,
      '? ������ ��� �������� ����������. ���������� �����.',
      analyticsKeyboard
    );
  }
}

async function handleWorkoutType(bot, chatId, userId, workoutType) {
  const workoutTypeMap = {
    '?? ������� ����������': 'strength',
    '???>? ������': 'cardio',
    '???+? ����/��������': 'yoga',
    '????+? ��������������': 'functional'
  };

  const type = workoutTypeMap[workoutType];
  
  if (type === 'strength') {
    // ��� ������� ���������� ���������� ��� ��������
    await bot.sendMessage(
      chatId,
      '?? **������� ����������**\n\n' +
      '�������� ����� ������:\n\n' +
      '?? **��������� ������** - ���������� ���������� �� ���� ���������� � ���������, ������ � ������������\n\n' +
      '? **������� ������** - ������ ������� ����� ���������� � ����������',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['?? ��������� ������'],
            ['? ������� ������'],
            ['?? ����� � ����']
          ],
          resize_keyboard: true,
          one_time_keyboard: false
        }
      }
    );
    return;
  }
  
  // ��� ������ ����� ���������� ���������� ������� �����
  try {
    // ��������� ������� ���������� � ���������� ����������
    const duration = 60; // 60 ����� �� ���������
    const calories = type === 'cardio' ? 400 : type === 'yoga' ? 200 : 300;
    const intensity = 3; // ������� �������������
    const exercisesCount = type === 'functional' ? 6 : 4;
    
    await addWorkout(userId, type, duration, calories, intensity, exercisesCount, `����������: ${workoutType}`);

    await bot.sendMessage(
      chatId,
      `? ���������� "${workoutType}" ��������!\n\n` +
      `?? ������ ����������:\n` +
      `? �����������������: ${duration} �����\n` +
      `?? �������: ${calories} ����\n` +
      `?? �������������: ${intensity}/5\n` +
      `????>? ����������: ${exercisesCount}\n\n` +
      `?? ��� ����� ��������� ������ ���������� �������� "?? ��������� ������".`,
      workoutKeyboard
    );
    
  } catch (error) {
    console.error('������ ������ ����������:', error);
    await bot.sendMessage(
      chatId,
      '? ������ ��� ������ ����������. ���������� �����.',
      workoutKeyboard
    );
  }
}

// ������� ��� ��������� ����������� ��-�������� ����� Workflow API
async function handleSpecialAIRequest(bot, chatId, user, dbUser, text, processingMessage, requestType) {
  // ���������� ���������
  userStates.delete(user.id);
  
  // �������� �������� ������������
  const subscription = await getActiveSubscription(dbUser.id);
  
  await bot.sendChatAction(chatId, 'typing');
  const thinkingMessage = await bot.sendMessage(chatId, `${processingMessage} �� �������: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"...`);
  
  try {
    // �������� ���������� workflow ID ��� ���� �������
    let workflowId = '';
    
    switch (requestType) {
      case 'training_program':
        workflowId = process.env.COZE_TRAINING_PROGRAM_WORKFLOW_ID;
        break;
      case 'nutrition_plan':
        workflowId = process.env.COZE_NUTRITION_PLAN_WORKFLOW_ID;
        break;
      case 'composition_analysis':
        workflowId = process.env.COZE_COMPOSITION_ANALYSIS_WORKFLOW_ID;
        break;
      case 'deep_research':
        workflowId = process.env.COZE_DEEP_RESEARCH_WORKFLOW_ID;
        break;
      default:
        workflowId = process.env.COZE_WORKFLOW_ID; // fallback
    }
    
    if (!workflowId) {
      throw new Error(`Workflow ID �� ������ ��� ����: ${requestType}`);
    }
    
    console.log(`?? ��������� ${requestType} workflow: ${workflowId}`);
    console.log(`?? ��������� ������������: "${text}"`);
    
    // ��������� ��������� ��� workflow
    const workflowParameters = {
      input: text,
      user_id: user.id.toString(),
      request_type: requestType
    };
    
    console.log(`?? ��������� workflow:`, workflowParameters);
    
    // ��������� workflow
    const workflowResponse = await runWorkflow(workflowId, workflowParameters);
    
    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});
    
    if (workflowResponse.success && workflowResponse.message) {
      // ���������, �������� �� ��� ������������� workflow
      const isInteractive = requestType === 'training_program' || requestType === 'nutrition_plan';
      
      if (isInteractive) {
        // ��������� ��������� �������������� workflow
        userInteractiveWorkflow.set(user.id, {
          type: requestType,
          workflowId: workflowId,
          initialMessage: text,
          eventId: workflowResponse.eventId, // ��������� event_id ��� �����������
          timestamp: Date.now()
        });
        console.log(`?? ��������� ��������� �������������� workflow ��� ������������ ${user.id}: ${requestType}, eventId: ${workflowResponse.eventId}`);
      }
      
      await sendLongMessage(bot, chatId, workflowResponse.message);
      
      // ��������� �������� workflow ��� ����������� �������� ���������� �������
      if (!isInteractive) {
        userWorkflowContext.set(user.id, {
          type: requestType,
          userQuestion: text,
          workflowResponse: workflowResponse.message,
          timestamp: Date.now()
        });
        console.log(`?? �������� �������� workflow ��� ������������ ${user.id}: ${requestType}`);
      }
      
      // ��������� ������������� �������
      await incrementRequestUsage(dbUser.id);
      console.log(`? ${requestType} workflow �������� �������`);
    } else {
      console.error(`? ������ ${requestType} workflow:`, workflowResponse.error);
      await bot.sendMessage(chatId, `? ��������, �� ������� �������� ����� �� ��: ${workflowResponse.error || '����������� ������'}`);
    }
    
  } catch (error) {
    console.error(`? ������ ��� ��������� ${requestType} �������:`, error);
    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});
    await bot.sendMessage(chatId, '? ��������� ������ ��� ��������� �������. ���������� �����.');
  }
}

// ������������� ������� ��� ��������� workflow ��������
async function handleWorkflowRequest(bot, chatId, user, dbUser, text, workflowEnvKey, processingMessage) {
  // ���������� ���������
  userStates.delete(user.id);
  
  // �������� �������� ������������
  const subscription = await getActiveSubscription(dbUser.id);
  
  await bot.sendChatAction(chatId, 'typing');
  const thinkingMessage = await bot.sendMessage(chatId, `${processingMessage} �� �������: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"...`);
  
  const workflowId = process.env[workflowEnvKey];
  
  // ��� workflow ���������� ���������� input
  const workflowParameters = {
    input: text,
    user_id: user.id.toString(),
    user_profile: `User ID: ${user.id}, Subscription: ${subscription?.plan_type || 'none'}`
  };
  
  console.log('?? ��������� ��� workflow:', { workflowEnvKey, parameters: workflowParameters });
  
  const workflowResponse = await runWorkflow(
    workflowId,
    workflowParameters
  );
  
  // ������� ��������� "������"
  try {
    await bot.deleteMessage(chatId, thinkingMessage.message_id);
  } catch (deleteError) {
    // ���������� ������ ��������
  }
  
  if (workflowResponse.success) {
    // ������ JSON ����� �� workflow
    let resultMessage = workflowResponse.message;
    try {
      const parsedData = JSON.parse(workflowResponse.data);
      if (parsedData.output_final) {
        resultMessage = parsedData.output_final;
      }
    } catch (parseError) {
      console.log('?? �� ������� ���������� JSON ����� workflow:', parseError.message);
    }
    
    // ���������� ������ ��� ����������
    let resultIcon = '??';
    let workflowType = '������';
    if (workflowEnvKey.includes('DEEP_RESEARCH')) {
      resultIcon = '??';
      workflowType = '�������� ������';
    } else if (workflowEnvKey.includes('TRAINING_PROGRAM')) {
      resultIcon = '????>?';
      workflowType = '��������� ����������';
    } else if (workflowEnvKey.includes('NUTRITION_PLAN')) {
      resultIcon = '??';
      workflowType = '���� �������';
    } else if (workflowEnvKey.includes('COMPOSITION_ANALYSIS')) {
      resultIcon = '??';
      workflowType = '������ �������';
    }
    
    // ��������� �������� ���������� workflow ��� ������������
    userWorkflowContext.set(user.id, {
      type: workflowType,
      query: text,
      result: resultMessage,
      timestamp: Date.now()
    });
    
    console.log(`?? �������� �������� workflow ��� ������������ ${user.id}:`, {
      type: workflowType,
      query: text.substring(0, 100) + '...'
    });
    
    // ��������� ������� ��������� �� ����� (Telegram ����� 4096 ��������)
    const MAX_MESSAGE_LENGTH = 4000; // ��������� �����
    const fullMessage = `${resultIcon} **���������:**\n\n${resultMessage}`;
    
    if (fullMessage.length <= MAX_MESSAGE_LENGTH) {
      await bot.sendMessage(chatId, fullMessage + '\n\n?? ��� �������� � ����: /menu');
    } else {
      // ��������� ��������� �� �����
      const messageParts = [];
      let currentPart = `${resultIcon} **���������:**\n\n`;
      const sentences = resultMessage.split(/(?<=[.!?])\s+/);
      
      for (const sentence of sentences) {
        if ((currentPart + sentence).length > MAX_MESSAGE_LENGTH) {
          messageParts.push(currentPart.trim());
          currentPart = sentence + ' ';
        } else {
          currentPart += sentence + ' ';
        }
      }
      
      if (currentPart.trim()) {
        messageParts.push(currentPart.trim());
      }
      
      // ���������� ����� � ���������� ����������
      for (let i = 0; i < messageParts.length; i++) {
        const part = messageParts[i];
        const isLast = i === messageParts.length - 1;
        const messageToSend = part + (isLast ? '\n\n?? ��� �������� � ����: /menu' : `\n\n?? ����� ${i + 1} �� ${messageParts.length}`);
        
        await bot.sendMessage(chatId, messageToSend);
        
        // ��������� �������� ����� �����������
        if (!isLast) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    // ��������� ������������� �������
    await incrementRequestUsage(dbUser.id);
    
  } else {
    await bot.sendMessage(chatId, `? ��������� ������ ��� ��������� �������: ${workflowResponse.error}\n\n?? ��� �������� � ����: /menu`);
  }
}

// === ��������������� ������� ��� ���������������� ������ ===

async function showWeightHistory(bot, chatId, userId) {
  try {
    const weightHistory = await getUserMetrics(userId, 'weight', 10);
    
    if (weightHistory.length === 0) {
      await bot.sendMessage(
        chatId,
        '?? **������� ����**\n\n? � ��� ���� ��� ������� ����.\n\n����������� "?? �������� ���" ��� ���������� ������ ������.',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    let message = '?? **������� ����** (��������� 10 �������)\n\n';
    weightHistory.forEach((record, index) => {
      const date = new Date(record.recorded_at).toLocaleDateString('ru-RU');
      const isLatest = index === 0 ? ' ?' : '';
      message += `?? ${date}: **${record.value} ${record.unit}**${isLatest}\n`;
    });

    message += '\n? - ��������� ������';

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...viewRecordsKeyboard });
  } catch (error) {
    await bot.sendMessage(chatId, '? ������ ��� ��������� ������� ����.');
  }
}

async function showUserGoals(bot, chatId, userId) {
  try {
    const goals = await getUserGoals(userId);
    
    if (goals.length === 0) {
      await bot.sendMessage(
        chatId,
        '?? **��� ����**\n\n? � ��� ���� ��� ������������� �����.\n\n����������� "?? ���������� ����" ��� ���������� ������ ����.',
        { parse_mode: 'Markdown', ...viewRecordsKeyboard }
      );
      return;
    }

    let message = '?? **��� ����**\n\n';
    goals.forEach((goal, index) => {
      const date = new Date(goal.created_at).toLocaleDateString('ru-RU');
      message += `${index + 1}. **${goal.goal_type}**\n`;
      message += `   ?? ����: ${goal.target_value}\n`;
      message += `   ?? �������: ${date}\n\n`;
    });

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...viewRecordsKeyboard });
  } catch (error) {
    await bot.sendMessage(chatId, '? ������ ��� ��������� �����.');
  }
}

async function showWorkoutHistory(bot, chatId, userId) {
  try {
    // ���������� getUserDetailedWorkouts ������ getUserWorkouts
    const workouts = await getUserDetailedWorkouts(userId, 10);
    
    if (workouts.length === 0) {
      await bot.sendMessage(
        chatId,
        '????>? ������� ����������\n\n' +
        '?? � ��� ���� ��� ������� ����������.\n\n' +
        '?? ����������� "????>? �������� ����������" ��� �������� ������ ������!',
        { ...viewRecordsKeyboard }
      );
      return;
    }

    let message = '????>? ������� ���������� (��������� 10)\n\n';
    workouts.forEach((workout, index) => {
      const date = new Date(workout.completed_at).toLocaleDateString('ru-RU');
      const time = new Date(workout.completed_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      const isLatest = index === 0 ? ' ??' : '';
      
      message += `?? ${date} � ${time}${isLatest}\n`;
      message += `?? ���: ${workout.workout_type === 'strength' ? '������� ����������' : workout.workout_type}\n`;
      
      if (workout.duration_minutes > 0) {
        message += `?? ������������: ${workout.duration_minutes} ���\n`;
      }
      
      // ���������� ������������ �� � ����� ����������
      if (workout.mood_before || workout.mood_after) {
        message += `?? ������������: `;
        if (workout.mood_before) {
          message += `�� ${workout.mood_before}/10`;
        }
        if (workout.mood_before && workout.mood_after) {
          message += ` > `;
        }
        if (workout.mood_after) {
          message += `����� ${workout.mood_after}/10`;
        }
        message += `\n`;
      }
      
      // ���������� �����������
      if (workout.notes && workout.notes.trim()) {
        message += `?? �����������: ${workout.notes}\n`;
      }
      
      // ���������� ��������� ���������� �� �����������
      if (workout.workout_details && workout.workout_details.exercises) {
        const details = workout.workout_details;
        const exerciseCount = details.exercises.length;
        const totalSets = details.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const totalReps = details.exercises.reduce((sum, ex) => 
          sum + ex.sets.reduce((setSum, set) => setSum + set.reps, 0), 0);
        const totalWeight = details.exercises.reduce((sum, ex) => 
          sum + ex.sets.reduce((setSum, set) => setSum + ((set.weight || 0) * set.reps), 0), 0);
        
        message += `?? ${exerciseCount} ���������� � ${totalSets} �������� � ${totalReps} ����������\n`;
        if (totalWeight > 0) {
          message += `?? ������� � �����������: ${totalWeight} ��\n`;
        }
        
        // ���������� ������ ����������
        message += `\n?? ����������:\n`;
        details.exercises.forEach((ex, i) => {
          const exerciseTotalReps = ex.sets.reduce((sum, set) => sum + set.reps, 0);
          const exerciseWeight = ex.sets.length > 0 ? (ex.sets[0].weight || 0) : 0;
          const weightText = exerciseWeight === 0 ? '����������� ���' : `${exerciseWeight} ��`;
          const avgReps = exerciseTotalReps > 0 ? Math.round(exerciseTotalReps / ex.sets.length) : 0;
          message += `   ${i + 1}. ${ex.name}: ${ex.sets.length}?${avgReps} (${weightText})\n`;
        });
        
        // ���������� ����������� � ���������� �� �������
        if (details.comments && details.comments.trim()) {
          message += `\n?? ������� � ����������: ${details.comments}\n`;
        }
      }
      
      message += '\n' + '-'.repeat(25) + '\n\n';
    });

    message += '?? - ��������� ����������\n';
    message += '?? ������: �������?������� ����������';

    await bot.sendMessage(chatId, message, { ...viewRecordsKeyboard });
  } catch (error) {
    console.error('������ ��� ��������� ������� ����������:', error);
    await bot.sendMessage(chatId, '������ ��� ��������� ������� ����������.');
  }
}

async function showUserStatistics(bot, chatId, userId) {
  try {
    const summary = await getUserDataSummary(userId);
    const weightHistory = await getUserMetrics(userId, 'weight', 2); // ��������� 2 ������ ��� ������� ���������
    const workouts = await getUserWorkouts(userId, 30); // �� ��������� �����
    
    let message = '?? **����������**\n\n';
    
    // ����� ����������
    message += `?? **����� ������:**\n`;
    message += `� ������� ����: **${summary.weightRecords}**\n`;
    message += `� ����������: **${summary.workoutRecords}**\n`;
    message += `� �����: **${summary.goalRecords}**\n\n`;
    
    // ��������� ����
    if (weightHistory.length >= 2) {
      const currentWeight = weightHistory[0].value;
      const previousWeight = weightHistory[1].value;
      const weightChange = currentWeight - previousWeight;
      const changeDirection = weightChange > 0 ? '??' : weightChange < 0 ? '??' : '??';
      
      message += `?? **���:**\n`;
      message += `� �������: **${currentWeight} ��**\n`;
      message += `� ���������: ${changeDirection} **${Math.abs(weightChange).toFixed(1)} ��**\n\n`;
    } else if (weightHistory.length === 1) {
      message += `?? **���:** **${weightHistory[0].value} ��**\n\n`;
    }
    
    // ���������� ���������� �� �����
    if (workouts.length > 0) {
      const totalMinutes = workouts.reduce((sum, w) => sum + w.duration_minutes, 0);
      const totalCalories = workouts.reduce((sum, w) => sum + (w.calories_burned || 0), 0);
      const avgPerWeek = (workouts.length / 4).toFixed(1);
      
      message += `????>? **���������� (30 ����):**\n`;
      message += `� �����: **${workouts.length}**\n`;
      message += `� �����: **${Math.round(totalMinutes / 60)} � ${totalMinutes % 60} ���**\n`;
      if (totalCalories > 0) {
        message += `� �������: **${totalCalories}**\n`;
      }
      message += `� � �������/������: **${avgPerWeek}**\n`;
    }

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...viewRecordsKeyboard });
  } catch (error) {
    await bot.sendMessage(chatId, '? ������ ��� ��������� ����������.');
  }
}

// === ��������������� ������� ===

// ������� ��� ����������� �������� �����
function safeParseInt(str, min = 1, max = 100, fallback = null) {
  const num = parseInt(str);
  return (isNaN(num) || num < min || num > max) ? fallback : num;
}

// ������� ��� �������� ����������
function parseMoodValue(text) {
  const moodMap = {
    '?? ����': 1,
    '?? ��������': 2,
    '?? ���������': 3,
    '?? ������': 4,
    '?? �������': 5
  };
  return moodMap[text] || null;
}

// ������� ��� ��������� ������ ����������
function getMoodEmoji(value) {
  const moodEmojis = {
    1: '??',
    2: '??',
    3: '??',
    4: '??',
    5: '??'
  };
  return moodEmojis[value] || '??';
}

// ������� ��� �������������� ������� ����������
function formatWorkoutTime(minutes) {
  if (minutes < 60) {
    return `${minutes} ���`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}� ${mins}���` : `${hours}�`;
}

// ������� ��� ���������� ���������� � ���������� � ���� ������
async function completeWorkout(userId, workout) {
  try {
    // �������� ID ������������ �� �� �� telegram_id
    const dbUser = await getUserByTelegramId(userId);
    
    // �������������� ������ ����������
    const workoutDetails = {
      exercises: workout.exercises || [],
      totalExercises: (workout.exercises || []).length,
      totalSets: (workout.exercises || []).reduce((sum, ex) => sum + (ex.sets || []).length, 0),
      totalReps: (workout.exercises || []).reduce((sum, ex) => 
        sum + (ex.sets || []).reduce((setSum, set) => setSum + (set.reps || 0), 0), 0
      ),
      averageIntensity: 'medium',
      totalCalories: 0, // ����� �������� ������ ������� � �������
      duration: Math.round((Date.now() - workout.startTime) / 60000) // � �������
    };
    
    // ��������� � ���� ������
    await saveDetailedWorkout(
      dbUser.id,
      workout.type || 'strength',
      workoutDetails.duration,
      workoutDetails,
      workout.moodBefore || 3,
      workout.moodAfter || 3,
      workout.generalComment || null
    );
    
    console.log(`? ���������� ������������ ${userId} ������� ���������`);
  } catch (error) {
    console.error('? ������ ���������� ����������:', error);
    throw error;
  }
}

// === ������� �������� ������� ===

async function handleDeleteLastWorkout(bot, chatId, userId) {
  try {
    const result = await deleteLastWorkout(userId);
    
    if (result.success) {
      const date = new Date(result.deletedAt).toLocaleDateString('ru-RU');
      const time = new Date(result.deletedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
      
      await bot.sendMessage(
        chatId,
        `? **���������� �������**\n\n` +
        `??? ������� ���������� �� ${date} � ${time}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `? **������ ��������**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('������ ��� �������� ��������� ����������:', error);
    await bot.sendMessage(chatId, '������ ��� �������� ����������.', { ...mainKeyboard });
  }
}

async function handleDeleteLastWeight(bot, chatId, userId) {
  try {
    const result = await deleteLastWeight(userId);
    
    if (result.success) {
      const date = new Date(result.deletedAt).toLocaleDateString('ru-RU');
      
      await bot.sendMessage(
        chatId,
        `? **������ ���� �������**\n\n` +
        `??? ������� ������ ���� ${result.value} �� �� ${date}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `? **������ ��������**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('������ ��� �������� ��������� ������ ����:', error);
    await bot.sendMessage(chatId, '������ ��� �������� ������ ����.', { ...mainKeyboard });
  }
}

async function confirmDeleteAllWorkouts(bot, chatId, userId) {
  await bot.sendMessage(
    chatId,
    '?? **��������!**\n\n' +
    '??? �� ������������� ������ ������� **���** ���� ����������?\n\n' +
    '? ��� �������� **����������**!\n\n' +
    '��� ������������� ��������: `������� ��� ����������`',
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
  
  userStates.set(chatId, 'waiting_confirm_delete_all_workouts');
}

async function confirmDeleteAllWeights(bot, chatId, userId) {
  await bot.sendMessage(
    chatId,
    '?? **��������!**\n\n' +
    '??? �� ������������� ������ ������� **���** ������ ����?\n\n' +
    '? ��� �������� **����������**!\n\n' +
    '��� ������������� ��������: `������� ��� ����`',
    { parse_mode: 'Markdown', ...mainKeyboard }
  );
  
  userStates.set(chatId, 'waiting_confirm_delete_all_weights');
}

async function processDeleteAllWorkouts(bot, chatId, userId) {
  try {
    const result = await deleteAllWorkouts(userId);
    
    if (result.success) {
      await bot.sendMessage(
        chatId,
        `? **��� ���������� �������**\n\n` +
        `??? �������: ${result.count} ����������`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `? **������ ��������**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('������ ��� �������� ���� ����������:', error);
    await bot.sendMessage(chatId, '������ ��� �������� ����������.', { ...mainKeyboard });
  }
}

async function processDeleteAllWeights(bot, chatId, userId) {
  try {
    const result = await deleteAllWeights(userId);
    
    if (result.success) {
      await bot.sendMessage(
        chatId,
        `? **��� ������ ���� �������**\n\n` +
        `??? �������: ${result.count} �������`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    } else {
      await bot.sendMessage(
        chatId,
        `? **������ ��������**\n\n` +
        `${result.message}`,
        { parse_mode: 'Markdown', ...mainKeyboard }
      );
    }
  } catch (error) {
    console.error('������ ��� �������� ���� ������� ����:', error);
    await bot.sendMessage(chatId, '������ ��� �������� ������� ����.', { ...mainKeyboard });
  }
}

// ������� ��� ��������� ������� ������������ �� ������������� workflow
async function handleInteractiveWorkflowResponse(bot, chatId, user, dbUser, userResponse, activeWorkflow) {
  try {
    console.log(`?? ��������� ������ ������������ �� ������������� workflow: ${activeWorkflow.type}`);
    
    await bot.sendChatAction(chatId, 'typing');
    const thinkingMessage = await bot.sendMessage(chatId, '?? ����������� ��� �����...');

    // ���������� ������������� workflow � ������� ������������
  const continueResponse = await continueInteractiveWorkflow(activeWorkflow.eventId, userResponse, activeWorkflow.type, user.id);

    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});

    if (continueResponse.success && continueResponse.message) {
      // ���������, ���� �� ����� eventId (�������� ��� ���� ��� �������)
      if (continueResponse.eventId) {
        // ��� ��� ���� ������������� ������ - ��������� ���������
        activeWorkflow.eventId = continueResponse.eventId;
        activeWorkflow.timestamp = Date.now();
        userInteractiveWorkflow.set(user.id, activeWorkflow);
        console.log(`? ������� ��������� ������������� ������, ����� eventId: ${continueResponse.eventId}`);
      } else {
        // ��� ��������� ��������� - ������� ��������� �������������� workflow
        userInteractiveWorkflow.delete(user.id);
        console.log(`? ������� ��������� ��������� �� �������������� workflow`);
        
        // ��������� ������������� �������
        await incrementRequestUsage(dbUser.id);
      }

      await sendLongMessage(bot, chatId, continueResponse.message);
      console.log(`? ����� �� ������������� workflow ${activeWorkflow.type} ��������� �������`);
    } else {
      console.error(`? ������ ����������� �������������� workflow:`, continueResponse.error);
      
      // ������� ��������� ��� ������
      userInteractiveWorkflow.delete(user.id);
      
      await bot.sendMessage(chatId, `? ��������, �� ������� ���������� ���������: ${continueResponse.error || '����������� ������'}`);
    }

  } catch (error) {
    console.error(`? ������ ��� ��������� ������ �� ������������� workflow:`, error);
    
    // ������� ��������� ��� ������
    userInteractiveWorkflow.delete(user.id);
    
    await bot.deleteMessage(chatId, thinkingMessage.message_id).catch(() => {});
    await bot.sendMessage(chatId, '? ��������� ������ ��� ��������� ������. ���������� �����.');
  }
}

// === �������������� ������� ===

// ������� ��� ��������� ��������� ������������
async function handleUserState(bot, chatId, user, dbUser, text, currentState) {
  // ����� ����� ��� ������ ��������� ��������� �� ��������� ����
  // ��� ��� ���� � �������� ������� handleTextMessage, ������� ���� ������� ��������
  console.log('��������� ��������� ������������:', currentState);
}

// ������� ��� ��������� ������ ��-�������
async function handleAITrainerConversation(bot, chatId, user, dbUser, text) {
  try {
    // ��������� ����������� ������ �������
    const requestStatus = await canUserMakeRequest(dbUser.id);
    
    if (!requestStatus.canMake) {
      await bot.sendMessage(
        chatId,
        '?? � ��� ����������� ������� � ��-�������.\n\n' +
        '?? ����� ������������ �������� 7 ���������� ��������\n' +
        '?? ��� ��������������� ������� �������� ��������!',
        noSubscriptionKeyboard
      );
      return;
    }
    
    if (text === '?? ��-������') {
      // ���������� ���������� � ��������� ��������
      let requestInfo = '';
      if (requestStatus.type === 'free') {
        requestInfo = `\n\n?? ���������� �������� ��������: ${requestStatus.remaining}/7`;
      } else if (requestStatus.type === 'subscription') {
        requestInfo = `\n\n?? �������� �� ��������: ${requestStatus.remaining}/${requestStatus.total}`;
      }

      // ���������� ����� ������� � ��
      userStates.set(user.id, 'chatting_with_ai');
      
      await bot.sendMessage(
        chatId,
        '?? *����� ���������� � ��-������!*\n\n' +
        '� ������ ��� �:\n' +
        '� ������������ �������� ����������\n' +
        '� �������� �� �������\n' +
        '� ��������� � �������� � �������\n\n' +
        '��������� ����� �������!' + requestInfo,
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    // ������������ ��������� ������������ � ������ ��-�������
    await bot.sendChatAction(chatId, 'typing');
    
    // ���������� ��������� � ���, ��� ��� ������
    const thinkingMessage = await bot.sendMessage(chatId, '?? ������������� ������������ �����...');
    
    // ���������, ���� �� �������� �� ����������� workflow
    const workflowContext = userWorkflowContext.get(user.id);
    let messageWithContext = text;
    
    if (workflowContext && (Date.now() - workflowContext.timestamp) < 600000) { // 10 �����
      messageWithContext = `�������� ����������� �������:
��� �������: ${workflowContext.type}
������ ������������: "${workflowContext.query}"
���������� ���������: "${workflowContext.result.substring(0, 1000)}..."

����� ������ ������������: ${text}`;
      
      console.log(`?? �������� �������� workflow � ��������� ��� ������������ ${user.id}`);
    }
    
    const aiResponse = await runDeepSeekChat(user.access_token, messageWithContext, user.id, '������� ��� ������������ ������?������: ���� ����������, ������������ ������ ��������, ������� ������ ����.');
    
    // ������� ��������� "������"
    try {
      await bot.deleteMessage(chatId, thinkingMessage.message_id);
    } catch (deleteError) {
      // ���������� ������ ��������
    }
    
    if (aiResponse.success) {
      await bot.sendMessage(chatId, aiResponse.message + '\n\n?? ��� �������� � ����: /menu');
      // ��������� ������������� �������
      await incrementRequestUsage(dbUser.id);
    } else {
      await bot.sendMessage(chatId, aiResponse.message);
    }
    
  } catch (error) {
    console.error('? ������ � ��-�������:', error);
    await bot.sendMessage(chatId, '? ��������� ������ ��� ��������� � ��. ���������� �����.');
  }
}

// ������� ��� ��������� workflow ������
async function handleWorkflowCommands(bot, chatId, user, dbUser, text) {
  try {
    console.log(`?? ������� Coze �� ������������ ${user.id}:`, text);
    
    // ��������� ������� /deepresearch ����� workflow
    if (text.toLowerCase().startsWith('/deepresearch')) {
      console.log('?? ���������� ������� /deepresearch, ������������� ��������� ��������');
      userStates.set(user.id, 'waiting_for_research_topic');
      
      await bot.sendMessage(chatId, 
        '?? **�������� ������������**\n\n' +
        '������� ���� ��� ���������� �������� �������.\n\n' +
        '?? **������� ���:**\n' +
        '� ������� �������� �� ������� ����������\n' +
        '� ��������� �������� � ������� ��������\n' +
        '� ����������� ����� ��� ������ � �������\n' +
        '� ������������ ���������� ��� ������ �����\n' +
        '� ���������� ������� ��� ��������������\n\n' +
        '?? �������� ���� ����:'
      );
      console.log('? ��������� ����������, ������� �� �������');
      return;
    }

    // ��������� ������� /training_program ����� workflow
    if (text.toLowerCase().startsWith('/training_program')) {
      console.log('????>? ���������� ������� /training_program, ������������� ��������� ��������');
      userStates.set(user.id, 'waiting_for_training_request');
      
      await bot.sendMessage(chatId, 
        '????>? **�������� ������������� ���������**\n\n' +
        '���������� �������� � ����� ����� � �������� ����������:\n\n' +
        '?? **�������:**\n' +
        '� ���� ���������� (���������, ����� �����, ����, ������������)\n' +
        '� ������� ���������� (�������, �������, �����������)\n' +
        '� ������� ���� � ������ ������ �������������\n' +
        '� ��������� ����� �� ����������\n' +
        '� ��������� ������������ (���, ���, ����� �������)\n' +
        '� ����������� �� �������� (���� ����)\n\n' +
        '?? ������� ���� ����������:'
      );
      return;
    }

    // ��������� ������� /nutrition_plan ����� workflow
    if (text.toLowerCase().startsWith('/nutrition_plan')) {
      console.log('?? ���������� ������� /nutrition_plan, ������������� ��������� ��������');
      userStates.set(user.id, 'waiting_for_nutrition_request');
      
      await bot.sendMessage(chatId, 
        '?? **�������� ����� �������**\n\n' +
        '��� ����������� ������������� ����� ������� �������:\n\n' +
        '?? **�������� ������:**\n' +
        '� ���� (���������, ����� �����, ����������� ����)\n' +
        '� ���, �������, ����, ������� ���\n' +
        '� ������� ���������� ����������\n' +
        '� ������� ������� ���� �������������\n\n' +
        '??? **������������:**\n' +
        '� �������� ��� ��������������� ���������\n' +
        '� ������ ��� ������� (�����, ����, ��� ������� � �.�.)\n' +
        '� ��������� ��������\n' +
        '� ������ �� �������\n\n' +
        '?? ���������� � ����:'
      );
      return;
    }

    // ��������� ������� /composition_analysis ����� workflow
    if (text.toLowerCase().startsWith('/composition_analysis')) {
      console.log('?? ���������� ������� /composition_analysis, ������������� ��������� ��������');
      userStates.set(user.id, 'waiting_for_supplement_info');
      
      await bot.sendMessage(chatId, 
        '?? **������ ������� �������**\n\n' +
        '��������� ���������� � ������� ��� ���������� �������:\n\n' +
        '?? **������� ��������:**\n' +
        '� ���� �������� � ��������\n' +
        '� �������� ������� � �������������\n' +
        '� ������ ������������ � �����������\n\n' +
        '?? **� �������������:**\n' +
        '� ������������� �����������\n' +
        '� ������������ ���������\n' +
        '� ������� ������������\n' +
        '� ������������ �� ����������\n' +
        '� ��������� �������� �������\n\n' +
        '?? ��������� ���������� � �������:'
      );
      return;
    }
    
    // ����������� �������
    await bot.sendMessage(
      chatId,
      '? ����������� �������. ��������� �������:\n\n' +
      '� `/deepresearch` - �������� ������\n' +
      '� `/training_program` - ��������� ����������\n' +
      '� `/nutrition_plan` - ���� �������\n' +
      '� `/composition_analysis` - ������ �������',
      mainKeyboard
    );
    
  } catch (error) {
    console.error('? ������ ��������� workflow �������:', error);
    await bot.sendMessage(chatId, '? ��������� ������ ��� ��������� �������. ���������� �����.');
  }
}

// ������� ��� ����������� ������� ��������
async function showPaymentHistory(bot, chatId, userId) {
  try {
    // �������� ��� �������� ������������ (������� ��������)
    const { getAllUserSubscriptions } = await import('../services/database.js');
    const subscriptions = await getAllUserSubscriptions(userId);
    
    if (subscriptions.length === 0) {
      await bot.sendMessage(
        chatId,
        '?? **������� ��������**\n\n' +
        '? � ��� ���� ��� ������� ��������.\n\n' +
        '?? �������� ������ �������� ��� ������ ������ � ��-��������!',
        { parse_mode: 'Markdown', ...subscriptionKeyboard }
      );
      return;
    }

    let message = '?? **������� ��������**\n\n';
    
    subscriptions.forEach((subscription, index) => {
      const startDate = new Date(subscription.start_date).toLocaleDateString('ru-RU');
      const endDate = new Date(subscription.end_date).toLocaleDateString('ru-RU');
      const createdDate = new Date(subscription.created_at).toLocaleDateString('ru-RU');
      
      const planNames = {
        'basic': '�������',
        'standard': '�����������', 
        'premium': '�������',
        'monthly': '��������'
      };
      
      const statusEmoji = subscription.status === 'active' ? '?' : subscription.status === 'expired' ? '?' : '?';
      
      message += `${index + 1}. ${statusEmoji} **${planNames[subscription.plan_type] || subscription.plan_type}**\n`;
      message += `   ?? �����: ${subscription.amount}?\n`;
      message += `   ?? ������: ${startDate} - ${endDate}\n`;
      message += `   ?? ������: ${subscription.status === 'active' ? '�������' : subscription.status === 'expired' ? '�������' : '���������'}\n`;
      message += `   ?? ��������: ${createdDate}\n`;
      if (subscription.status === 'active') {
        message += `   ?? ��������: ${subscription.requests_used}/${subscription.requests_limit}\n`;
      }
      message += '\n';
    });

    message += '?? ��� ��������� �������� ������� "?? �������� ��������"';

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown', ...subscriptionKeyboard });
    
  } catch (error) {
    console.error('������ ��������� ������� ��������:', error);
    await bot.sendMessage(
      chatId,
      '? ������ ��� �������� ������� ��������. ���������� �����.',
      subscriptionKeyboard
    );
  }
}

