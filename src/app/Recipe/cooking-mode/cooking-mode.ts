import {
  Component,
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
import { RecipeDetailPageData, RecipeStep } from '../recipe.models';
import { RecipeService } from '../service/recipe.service';

interface BrowserSpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
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

  private timerId: ReturnType<typeof setInterval> | undefined;
  private recognition: BrowserSpeechRecognition | undefined;
  private isSpeechRecognitionActive = false;
  private recipeId = 1;

  readonly currentStepIndex = signal(0);
  readonly steps = signal<RecipeStep[]>([]);
  readonly remainingSeconds = signal(0);
  readonly isTimerRunning = signal(false);
  readonly isDeducting = signal(false);
  readonly recipeTitle = signal('專注料理模式');
  readonly targetServings = signal(1);

  readonly currentStep = computed(
    () => this.steps()[this.currentStepIndex()] ?? null
  );

  readonly progress = computed(() => {
    const stepCount = this.steps().length;
    return stepCount
      ? Math.round(((this.currentStepIndex() + 1) / stepCount) * 100)
      : 0;
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
    this.recipeTitle.set(pageData.recipe.title);
    this.steps.set(pageData.recipe.steps);
    this.resetStepTimer();
    this.initializeSpeechRecognition();
  }

  ngOnDestroy(): void {
    this.isSpeechRecognitionActive = false;
    this.stopTimer();
    this.recognition?.stop();
  }

  loadRecipe(): void {
    this.recipeService.getRecipeById(this.recipeId).subscribe({
      next: (response) => {
        if (response.success && response.data) {
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
      return;
    }

    this.recognition = new RecognitionConstructor();
    this.recognition.lang = 'zh-TW';
    this.recognition.continuous = true;
    this.recognition.interimResults = false;
    this.recognition.onresult = (event) => {
      const latestResult = event.results[event.results.length - 1];
      this.handleVoiceCommand(latestResult[0].transcript);
    };
    this.recognition.onend = () => {
      if (this.isSpeechRecognitionActive) {
        this.tryStartSpeechRecognition();
      }
    };

    this.isSpeechRecognitionActive = true;
    this.tryStartSpeechRecognition();
  }

  private tryStartSpeechRecognition(): void {
    try {
      this.recognition?.start();
    } catch {
      this.isSpeechRecognitionActive = false;
    }
  }

  private handleVoiceCommand(command: string): void {
    if (command.includes('下一步')) {
      this.nextStep();
    } else if (command.includes('上一步')) {
      this.previousStep();
    } else if (command.includes('開始計時')) {
      this.startTimer();
    } else if (command.includes('暫停')) {
      this.stopTimer();
    } else if (command.includes('完成料理')) {
      this.completeCooking();
    }
  }

  private showError(detail: string): void {
    this.messageService.add({
      severity: 'error',
      summary: '操作失敗',
      detail
    });
  }
}
