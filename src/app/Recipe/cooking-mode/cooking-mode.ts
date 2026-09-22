import {
  Component,
  NgZone,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';

import { recipeDemoConfig } from '../api.config';
import {
  RecipeDetail,
  RecipeDetailPageData,
  RecipeStep
} from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

interface BrowserSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface BrowserSpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onstart: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: ((event: BrowserSpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}

interface BrowserSpeechRecognitionConstructor {
  new(): BrowserSpeechRecognition;
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

@Component({
  selector: 'app-cooking-mode',
  imports: [RouterLink, ButtonModule, ProgressBarModule, ToastModule],
  providers: [MessageService],
  templateUrl: './cooking-mode.html',
  styleUrl: './cooking-mode.css'
})
export class CookingMode implements OnInit, OnDestroy {
  private readonly recipeService = inject(RecipeService);
  private readonly route = inject(ActivatedRoute);
  private readonly messageService = inject(MessageService);
  private readonly ngZone = inject(NgZone);

  private timerId: ReturnType<typeof setInterval> | undefined;
  private recognition: BrowserSpeechRecognition | undefined;
  private shouldKeepListening = false;
  private recipeId = 1;

  readonly currentStepIndex = signal(0);
  readonly recipe = signal<RecipeDetail | null>(null);
  readonly steps = signal<RecipeStep[]>([]);
  readonly remainingSeconds = signal(0);
  readonly isTimerRunning = signal(false);
  readonly isDeducting = signal(false);
  readonly recipeTitle = signal('專注料理模式');
  readonly targetServings = signal(1);
  readonly isSpeechSupported = signal(false);
  readonly isListening = signal(false);
  readonly speechStatus = signal('請點擊「啟用語音」並允許瀏覽器使用麥克風。');
  readonly lastRecognizedCommand = signal('');

  readonly currentStep = computed(
    () => this.steps()[this.currentStepIndex()] ?? null
  );

  readonly progress = computed(() => {
    const stepCount = this.steps().length;
    return stepCount
      ? Math.round(((this.currentStepIndex() + 1) / stepCount) * 100)
      : 0;
  });

  readonly scaledIngredients = computed(() => {
    const recipe = this.recipe();
    if (!recipe) {
      return [];
    }

    const ratio = this.targetServings() / Math.max(recipe.defaultServings, 1);
    return recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      display: ingredient.baseAmount === null
        ? ingredient.displayAmount
        : `${this.formatAmount(ingredient.baseAmount * ratio)} ${ingredient.unit}`
    }));
  });

  ngOnInit(): void {
    this.recipeId = Number(this.route.snapshot.paramMap.get('id')) || 1;
    const requestedServings = Number(
      this.route.snapshot.queryParamMap?.get('servings')
    );
    this.targetServings.set(
      Number.isInteger(requestedServings)
        ? Math.min(20, Math.max(1, requestedServings))
        : 1
    );

    const pageData = this.route.snapshot.data['pageData'] as RecipeDetailPageData;
    this.recipe.set(pageData.recipe);
    this.recipeTitle.set(pageData.recipe.title);
    this.steps.set(pageData.recipe.steps);
    this.resetStepTimer();
    this.initializeSpeechRecognition();
  }

  ngOnDestroy(): void {
    this.shouldKeepListening = false;
    this.stopTimer();
    this.recognition?.stop();
  }

  loadRecipe(): void {
    this.recipeService.getRecipeById(this.recipeId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.recipe.set(response.data);
          this.recipeTitle.set(response.data.title);
          this.steps.set(response.data.steps);
          this.resetStepTimer();
          return;
        }

        this.showError(response.message);
      },
      error: () => this.showError('無法載入料理步驟，請確認 API 服務。')
    });
  }

  nextStep(): void {
    if (this.currentStepIndex() >= this.steps().length - 1) {
      return;
    }

    this.currentStepIndex.update((index) => index + 1);
    this.resetStepTimer();
  }

  previousStep(): void {
    if (this.currentStepIndex() === 0) {
      return;
    }

    this.currentStepIndex.update((index) => index - 1);
    this.resetStepTimer();
  }

  toggleTimer(): void {
    this.isTimerRunning() ? this.stopTimer() : this.startTimer();
  }

  goToStep(index: number): void {
    if (index < 0 || index >= this.steps().length) {
      return;
    }

    this.currentStepIndex.set(index);
    this.resetStepTimer();
  }

  toggleSpeechRecognition(): void {
    if (!this.recognition) {
      this.speechStatus.set('此瀏覽器不支援語音辨識，請改用最新版 Chrome 或 Edge。');
      return;
    }

    if (this.shouldKeepListening) {
      this.stopSpeechRecognition();
      return;
    }

    this.shouldKeepListening = true;
    this.speechStatus.set('正在啟動麥克風……');
    this.tryStartSpeechRecognition();
  }

  completeCooking(): void {
    if (this.isDeducting()) {
      return;
    }

    this.isDeducting.set(true);
    this.recipeService.completeCooking({
      userId: recipeDemoConfig.userId,
      recipeId: this.recipeId,
      targetServings: this.targetServings()
    }).subscribe({
      next: (response) => {
        this.isDeducting.set(false);

        if (!response.success) {
          this.showError(response.message);
          return;
        }

        const deductionSummary = response.data
          ?.map((item) =>
            `${item.ingredientName} ${item.consumedAmount}${item.unit}`
          )
          .join('、') || '無需扣除庫存';

        this.messageService.add({
          severity: 'success',
          summary: '料理完成',
          detail: `${response.message} ${deductionSummary}`
        });
      },
      error: () => {
        this.isDeducting.set(false);
        this.showError('扣除庫存時發生連線錯誤。');
      }
    });
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainingSeconds = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainingSeconds}`;
  }

  private resetStepTimer(): void {
    this.stopTimer();
    this.remainingSeconds.set(this.currentStep()?.timerSeconds ?? 0);
  }

  private startTimer(): void {
    if (this.remainingSeconds() <= 0 || this.timerId) {
      return;
    }

    this.isTimerRunning.set(true);
    this.timerId = setInterval(() => {
      if (this.remainingSeconds() <= 1) {
        this.remainingSeconds.set(0);
        this.stopTimer();
        this.messageService.add({
          severity: 'info',
          summary: '計時完成',
          detail: '可以進行下一個料理步驟。'
        });
        return;
      }

      this.remainingSeconds.update((seconds) => seconds - 1);
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = undefined;
    this.isTimerRunning.set(false);
  }

  private initializeSpeechRecognition(): void {
    const speechWindow = window as SpeechRecognitionWindow;
    const RecognitionConstructor = speechWindow.SpeechRecognition
      ?? speechWindow.webkitSpeechRecognition;

    if (!RecognitionConstructor) {
      this.speechStatus.set('此瀏覽器不支援語音辨識，請改用最新版 Chrome 或 Edge。');
      return;
    }

    this.isSpeechSupported.set(true);
    this.recognition = new RecognitionConstructor();
    this.recognition.lang = 'zh-TW';
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.onstart = () => {
      this.ngZone.run(() => {
        this.isListening.set(true);
        this.speechStatus.set('語音辨識中，請說出一個料理口令。');
      });
    };
    this.recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      this.ngZone.run(() => {
        this.shouldKeepListening = false;
        this.handleVoiceCommand(latestResult[0].transcript);
        this.recognition?.stop();
      });
    };
    this.recognition.onerror = (event) => {
      this.ngZone.run(() => this.handleSpeechRecognitionError(event.error));
    };
    this.recognition.onend = () => {
      this.ngZone.run(() => {
        this.isListening.set(false);
        if (this.shouldKeepListening) {
          this.speechStatus.set('沒有收到完整口令，請點擊按鈕後再說一次。');
        }
        this.shouldKeepListening = false;
      });
    };
  }

  private formatAmount(amount: number): string {
    return Number.isInteger(amount)
      ? amount.toString()
      : amount.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
  }

  private tryStartSpeechRecognition(): void {
    try {
      this.recognition?.start();
    } catch (error) {
      this.shouldKeepListening = false;
      this.isListening.set(false);
      this.speechStatus.set(
        error instanceof Error
          ? `語音辨識無法啟動：${error.message}`
          : '語音辨識無法啟動，請重新整理頁面後再試。'
      );
    }
  }

  private handleVoiceCommand(command: string): void {
    const normalizedCommand = command.replace(/[\s，。！？、]/g, '');
    this.lastRecognizedCommand.set(command.trim());

    if (this.matchesCommand(normalizedCommand, ['下一步', '繼續'])) {
      this.nextStep();
      this.speechStatus.set('已執行：下一步。');
    } else if (this.matchesCommand(normalizedCommand, ['上一步', '返回'])) {
      this.previousStep();
      this.speechStatus.set('已執行：上一步。');
    } else if (this.matchesCommand(normalizedCommand, ['開始計時', '計時'])) {
      this.startTimer();
      this.speechStatus.set('已執行：開始計時。');
    } else if (this.matchesCommand(normalizedCommand, ['暫停', '停止'])) {
      this.stopTimer();
      this.speechStatus.set('已執行：暫停計時。');
    } else if (this.matchesCommand(normalizedCommand, ['完成料理', '煮好了'])) {
      this.completeCooking();
      this.speechStatus.set('已執行：完成料理。');
    } else {
      this.speechStatus.set(`未辨識料理口令：${command.trim()}`);
    }
  }

  private stopSpeechRecognition(): void {
    this.shouldKeepListening = false;
    this.isListening.set(false);
    this.speechStatus.set('語音辨識已停止。');
    this.recognition?.stop();
  }

  private handleSpeechRecognitionError(errorCode: string): void {
    const errorMessages: Record<string, string> = {
      'not-allowed': '麥克風權限被拒絕，請在瀏覽器網址列允許麥克風後重試。',
      'service-not-allowed': '瀏覽器已封鎖語音辨識服務，請檢查網站權限。',
      'audio-capture': '找不到可用的麥克風，請確認裝置與系統輸入設定。',
      'network': '語音辨識服務連線失敗，請確認網路後重試。',
      'no-speech': '目前沒有聽到語音，請靠近麥克風再說一次。'
    };
    const isRecoverable = errorCode === 'no-speech';

    if (!isRecoverable) {
      this.shouldKeepListening = false;
    }

    this.isListening.set(false);
    this.speechStatus.set(
      errorMessages[errorCode] ?? `語音辨識失敗（${errorCode}），請稍後重試。`
    );
  }

  private matchesCommand(command: string, keywords: string[]): boolean {
    return keywords.some((keyword) => command.includes(keyword));
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: '操作失敗',
      detail
    });
  }
}
